// ============================================================
// Applying engine decisions
// ============================================================
// adaptiveEngine.ts decides; this module records. It gathers the
// history the engine needs, turns each decision into an
// AdaptiveAdjustment a parent can read, and enforces the one hard
// rule: support is only ever *reduced* after a parent approves it.
// Increasing support is applied immediately (and still logged).

import {
  AdaptiveAdjustment,
  AdaptiveItemType,
  CardOutcome,
  ReviewCard,
  SessionAttempt,
  StepOutcome,
  SupportTier,
} from "../types/models";
import { decideReviewCard, decideStepTier, TierDecision } from "./adaptiveEngine";
import * as db from "./db";

const DAY_MS = 24 * 60 * 60 * 1000;

type StepLog = SessionAttempt["stepLogs"][number];

/** When an adjustment last changed anything -- outcomes before this don't count toward a new decision. */
function lastEventAt(adj: AdaptiveAdjustment): string {
  return adj.resolvedAt ?? adj.createdAt;
}

export function isPending(adj: AdaptiveAdjustment): boolean {
  return adj.requiresParentApproval && !adj.approved && (adj.status ?? "pending") === "pending";
}

/**
 * The outcomes the engine should see for one step: oldest -> newest,
 * only at the step's current tier, and only since the last adjustment
 * on that step. Without that cutoff, the same three "need help"s that
 * triggered an escalation would trigger another one next time.
 * A still-pending fade does NOT reset the window.
 */
export function outcomesForStep(
  attempts: SessionAttempt[],
  stepId: string,
  currentTier: SupportTier,
  itemAdjustments: AdaptiveAdjustment[]
): StepOutcome[] {
  const cutoff = itemAdjustments
    .filter((a) => !isPending(a))
    .map(lastEventAt)
    .sort()
    .pop();

  return attempts
    .flatMap((a) => a.stepLogs)
    .filter(
      (l: StepLog) =>
        l.stepId === stepId &&
        l.supportTierAtAttempt === currentTier &&
        (!cutoff || l.timestamp > cutoff)
    )
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((l) => l.outcome);
}

function buildAdjustment(
  childId: string,
  itemType: AdaptiveItemType,
  itemId: string,
  fromTier: SupportTier,
  toTier: SupportTier,
  reason: string,
  requiresParentApproval: boolean,
  nowIso: string
): AdaptiveAdjustment {
  return {
    id: db.newId(),
    childId,
    itemType,
    itemId,
    fromTier,
    toTier,
    reason,
    requiresParentApproval,
    approved: !requiresParentApproval,
    status: requiresParentApproval ? "pending" : "approved",
    resolvedAt: requiresParentApproval ? undefined : nowIso,
    createdAt: nowIso,
  };
}

/** Any pending fade on an item that just changed tier no longer makes sense. */
async function supersedePending(itemAdjustments: AdaptiveAdjustment[], nowIso: string) {
  for (const adj of itemAdjustments.filter(isPending)) {
    await db.updateAdjustment({ ...adj, status: "superseded", resolvedAt: nowIso });
  }
}

export interface AdaptationResult {
  decision: TierDecision;
  adjustment?: AdaptiveAdjustment;
}

/**
 * Call after a step's final (non-break) log has been saved.
 * Escalations update the session immediately; fades become a pending
 * adjustment. At most one pending fade exists per step.
 * Re-reads the session so an earlier step's change in the same run
 * is never overwritten by a stale copy.
 */
export async function adaptStep(
  sessionId: string,
  stepId: string,
  nowIso: string
): Promise<AdaptationResult> {
  const session = await db.getSession(sessionId);
  const step = session?.steps.find((s) => s.id === stepId);
  if (!session || !step) {
    // Session or step was deleted mid-run; nothing to adapt.
    return { decision: { nextTier: 0, changed: false, direction: "none", reason: "Step no longer exists.", requiresParentApproval: false } };
  }

  const [attempts, adjustments] = await Promise.all([
    db.listSessionAttempts(session.childId),
    db.listAdjustments(session.childId),
  ]);
  const itemAdjustments = adjustments.filter((a) => a.itemId === stepId);
  const sessionAttempts = attempts.filter((a) => a.sessionId === session.id);

  const outcomes = outcomesForStep(sessionAttempts, stepId, step.supportTier, itemAdjustments);
  const decision = decideStepTier(step.supportTier, outcomes);
  if (!decision.changed) return { decision };

  if (decision.requiresParentApproval) {
    if (itemAdjustments.some(isPending)) return { decision };
    const adjustment = buildAdjustment(
      session.childId, "session_step", stepId, step.supportTier,
      decision.nextTier, decision.reason, true, nowIso
    );
    await db.saveAdjustment(adjustment);
    return { decision, adjustment };
  }

  await supersedePending(itemAdjustments, nowIso);
  const adjustment = buildAdjustment(
    session.childId, "session_step", stepId, step.supportTier,
    decision.nextTier, decision.reason, false, nowIso
  );
  await db.saveSession({
    ...session,
    steps: session.steps.map((s) => (s.id === stepId ? { ...s, supportTier: decision.nextTier } : s)),
  });
  await db.saveAdjustment(adjustment);
  return { decision, adjustment };
}

/**
 * Records one review answer and reschedules the card. Spacing and
 * streaks always update; a tier *reduction* waits for the parent.
 */
export async function recordReview(
  card: ReviewCard,
  outcome: CardOutcome,
  nowIso: string
): Promise<ReviewCard> {
  const decision = decideReviewCard(card, outcome);
  const itemAdjustments = (await db.listAdjustments(card.childId)).filter(
    (a) => a.itemId === card.id
  );

  await db.saveReviewAttempt({
    id: db.newId(),
    cardId: card.id,
    childId: card.childId,
    outcome,
    supportTierAtAttempt: card.supportTier,
    timestamp: nowIso,
  });

  const tierChanged = decision.nextTier !== card.supportTier;
  let nextTier = card.supportTier;
  if (tierChanged && decision.requiresParentApproval) {
    if (!itemAdjustments.some(isPending)) {
      await db.saveAdjustment(buildAdjustment(
        card.childId, "review_card", card.id, card.supportTier,
        decision.nextTier, decision.reason, true, nowIso
      ));
    }
  } else if (tierChanged) {
    await supersedePending(itemAdjustments, nowIso);
    await db.saveAdjustment(buildAdjustment(
      card.childId, "review_card", card.id, card.supportTier,
      decision.nextTier, decision.reason, false, nowIso
    ));
    nextTier = decision.nextTier;
  }

  const updated: ReviewCard = {
    ...card,
    supportTier: nextTier,
    intervalDays: decision.nextIntervalDays,
    correctStreak: decision.nextCorrectStreak,
    struggleStreak: decision.nextStruggleStreak,
    dueAt: new Date(Date.parse(nowIso) + decision.nextIntervalDays * DAY_MS).toISOString(),
  };
  await db.saveReviewCard(updated);
  return updated;
}

/**
 * Parent approves a pending fade. If the item has moved off the tier
 * the proposal was made from, it's marked superseded instead of
 * applied -- approving a stale proposal must never skip a tier.
 */
export async function approveAdjustment(adj: AdaptiveAdjustment, nowIso: string): Promise<boolean> {
  let applied = false;
  if (adj.itemType === "session_step") {
    const session = (await db.listSessions(adj.childId)).find((s) =>
      s.steps.some((st) => st.id === adj.itemId)
    );
    const step = session?.steps.find((st) => st.id === adj.itemId);
    if (session && step && step.supportTier === adj.fromTier) {
      await db.saveSession({
        ...session,
        steps: session.steps.map((st) =>
          st.id === adj.itemId ? { ...st, supportTier: adj.toTier } : st
        ),
      });
      applied = true;
    }
  } else {
    const card = (await db.listReviewCards(adj.childId)).find((c) => c.id === adj.itemId);
    if (card && card.supportTier === adj.fromTier) {
      await db.saveReviewCard({ ...card, supportTier: adj.toTier });
      applied = true;
    }
  }

  await db.updateAdjustment({
    ...adj,
    approved: applied,
    status: applied ? "approved" : "superseded",
    resolvedAt: nowIso,
  });
  return applied;
}

export async function declineAdjustment(adj: AdaptiveAdjustment, nowIso: string): Promise<void> {
  await db.updateAdjustment({ ...adj, approved: false, status: "declined", resolvedAt: nowIso });
}
