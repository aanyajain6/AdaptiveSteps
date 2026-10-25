// ============================================================
// Demo data for the public web deploy
// ============================================================
// A cold visitor to the hosted demo should land on a living app, not an
// empty one. When the build sets EXPO_PUBLIC_DEMO_SEED=true and the
// device has no profiles yet, this seeds one learner, one session with
// a week of history, and a few review cards -- once. Local dev, the
// native apps, and tests never seed (the flag is off).
//
// The history is consistent with the engine's real rules, so the
// dashboard shows a true escalation (3 "need help"s in a row) and a
// true pending fade (5 independent completions), not invented numbers.

import {
  AdaptiveAdjustment,
  ChildProfile,
  ReviewAttempt,
  ReviewCard,
  SessionAttempt,
  StepOutcome,
  StudySession,
  SupportTier,
} from "../types/models";
import * as db from "./db";

export const DEMO_SEED_ENABLED = process.env.EXPO_PUBLIC_DEMO_SEED === "true";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

/** Seeds the demo once. Returns true if it seeded. */
export async function seedDemoIfNeeded(nowIso: string, enabled = DEMO_SEED_ENABLED): Promise<boolean> {
  if (!enabled || (await db.isDemoSeeded())) return false;
  // Never mix demo data into a device that already has real data.
  if ((await db.listChildren()).length > 0) {
    await db.markDemoSeeded();
    return false;
  }
  await writeDemo(Date.parse(nowIso));
  await db.markDemoSeeded();
  return true;
}

async function writeDemo(now: number) {
  const at = (daysAgo: number, minutes = 0) => new Date(now - daysAgo * DAY_MS + minutes * MIN_MS).toISOString();
  const childId = db.newId();

  const child: ChildProfile = {
    id: childId,
    name: "Sam",
    ageBand: "7-9",
    preferredFormat: "picture",
    reduceAnimations: false,
    highContrast: false,
    textScale: 1,
    createdAt: at(14),
  };

  const steps = [
    { label: "Get out your fractions worksheet", hint: "It's in the blue folder in your backpack", subjectTag: "Setup", tier: 1 },
    { label: "Read problem 1 out loud", hint: "Point to each word as you read it", subjectTag: "Reading", tier: 2 },
    { label: "Shade the fraction on the picture", hint: "The bottom number tells you how many parts", subjectTag: "Math", tier: 1 },
    { label: "Check your answer in the answer box", hint: undefined, subjectTag: "Math", tier: 0 },
    { label: "Put the worksheet back in the folder", hint: "Blue folder, then backpack", subjectTag: "Setup", tier: 1 },
  ].map((s) => ({ id: db.newId(), label: s.label, hint: s.hint, subjectTag: s.subjectTag, supportTier: s.tier as SupportTier }));

  const session: StudySession = {
    id: db.newId(),
    childId,
    title: "Fractions homework",
    subject: "Math",
    steps,
    createdAt: at(14),
  };

  // Five past runs, oldest first. Step 2 needed help three runs in a row
  // at tier 1 (-> escalated to 2); step 1 was done independently every
  // time (-> a fade waiting for the parent's OK).
  const runs: { daysAgo: number; outcomes: StepOutcome[]; step2Tier: SupportTier; mood: [string, string] }[] = [
    { daysAgo: 9, outcomes: ["done", "need_help", "need_help", "done", "done"], step2Tier: 1, mood: ["worried", "okay"] },
    { daysAgo: 7, outcomes: ["done", "need_help", "done", "done", "done"], step2Tier: 1, mood: ["tired", "happy"] },
    { daysAgo: 5, outcomes: ["done", "need_help", "need_help", "done", "done"], step2Tier: 1, mood: ["okay", "happy"] },
    { daysAgo: 3, outcomes: ["done", "done", "done", "done", "need_help"], step2Tier: 2, mood: ["happy", "happy"] },
    { daysAgo: 1, outcomes: ["done", "need_help", "done", "done", "done"], step2Tier: 2, mood: ["okay", "happy"] },
  ];

  const attempts: SessionAttempt[] = runs.map((run) => ({
    id: db.newId(),
    sessionId: session.id,
    childId,
    startedAt: at(run.daysAgo),
    completedAt: at(run.daysAgo, 25),
    moodBefore: run.mood[0] as SessionAttempt["moodBefore"],
    moodAfter: run.mood[1] as SessionAttempt["moodAfter"],
    stepLogs: steps.map((step, i) => ({
      stepId: step.id,
      outcome: run.outcomes[i],
      msElapsed: (2 + i) * MIN_MS,
      supportTierAtAttempt: i === 1 ? run.step2Tier : step.supportTier,
      timestamp: at(run.daysAgo, 2 + i * 4),
      helpRequests: run.outcomes[i] === "need_help" ? 1 : 0,
      choices: [],
    })),
  }));

  const adjustments: AdaptiveAdjustment[] = [
    {
      id: db.newId(),
      childId,
      itemType: "session_step",
      itemId: steps[1].id,
      fromTier: 1,
      toTier: 2,
      reason: "Needed help on this step 3 times in a row — adding a more detailed prompt.",
      requiresParentApproval: false,
      approved: true,
      status: "approved",
      resolvedAt: at(5, 10),
      createdAt: at(5, 10),
    },
    {
      id: db.newId(),
      childId,
      itemType: "session_step",
      itemId: steps[0].id,
      fromTier: 1,
      toTier: 0,
      reason: "Completed this step independently 5 times in a row — offering to reduce support.",
      requiresParentApproval: true,
      approved: false,
      status: "pending",
      createdAt: at(1, 3),
    },
  ];

  const card = (front: string, back: string, subject: string, tier: SupportTier, intervalDays: number, dueInDays: number): ReviewCard => ({
    id: db.newId(),
    childId,
    subject,
    front,
    back,
    supportTier: tier,
    intervalDays,
    dueAt: new Date(now + dueInDays * DAY_MS).toISOString(),
    correctStreak: 0,
    struggleStreak: 0,
    createdAt: at(12),
  });
  const cards = [
    card("7 × 8", "56", "Math facts", 0, 4, -0.1),
    card("Which is bigger: 3/4 or 1/2?", "3/4", "Fractions", 1, 2, -0.1),
    card("What is the capital of France?", "Paris", "Geography", 2, 1, -0.1),
    card("Spell the word that means “needed”", "necessary", "Spelling", 1, 2, 2),
    card("6 × 7", "42", "Math facts", 0, 8, 5),
  ];

  // Two weeks of practice, trending better, so the retention chart has a story.
  const reviews: ReviewAttempt[] = [];
  for (let daysAgo = 13; daysAgo >= 1; daysAgo -= 2) {
    cards.slice(0, 4).forEach((c, i) => {
      const improving = 13 - daysAgo + i * 2;
      reviews.push({
        id: db.newId(),
        cardId: c.id,
        childId,
        outcome: improving % 5 === 0 ? "needed_support" : improving % 7 === 0 ? "incorrect" : "correct",
        supportTierAtAttempt: c.supportTier,
        timestamp: at(daysAgo, i * 3),
      });
    });
  }

  await db.saveChild(child);
  await db.saveSession(session);
  for (const a of attempts) await db.saveSessionAttempt(a);
  for (const adj of adjustments) await db.saveAdjustment(adj);
  for (const c of cards) await db.saveReviewCard(c);
  for (const r of reviews) await db.saveReviewAttempt(r);
  await db.setActiveChildId(childId);
}
