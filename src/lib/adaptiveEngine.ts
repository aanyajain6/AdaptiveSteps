// ============================================================
// The adaptive engine
// ============================================================
// Pure functions, no UI, no storage -- fully unit-testable.
// Modeled on two evidence-based, usually-separate special-ed
// practices, reconciled into one decision rule per item:
//
//  - MTSS (Multi-Tiered System of Supports): support tier is set
//    by measured response to instruction, not by diagnosis, and
//    can differ per skill for the same child.
//  - Errorless learning vs. retrieval practice: a child who is
//    struggling on a specific item gets MORE scaffolding (fewer
//    chances to fail) before being asked to recall it on their
//    own; a child who is succeeding gets LESS scaffolding and
//    more real retrieval challenge, because effortful recall is
//    what actually strengthens memory for a learner who can
//    handle it.
//
// Every decision returns a plain-language `reason` -- nothing
// here is a black box a parent can't read.

import { SupportTier, StepOutcome, CardOutcome } from "../types/models";

export const MAX_TIER: SupportTier = 3;
export const MIN_TIER: SupportTier = 0;

const ESCALATE_AFTER = 3; // consecutive "need_help" on a step
const FADE_AFTER = 5; // consecutive independent "done" on a step
const CARD_ESCALATE_AFTER = 2; // consecutive misses on a review card
const CARD_FADE_AFTER = 3; // consecutive correct-with-support answers

const BASE_INTERVAL_DAYS = 1;
const MAX_INTERVAL_DAYS = 60;
const INTERVAL_GROWTH_ON_CORRECT = 2.0;
const INTERVAL_SHRINK_ON_INCORRECT = 0.5;

function clampTier(tier: number): SupportTier {
  return Math.max(MIN_TIER, Math.min(MAX_TIER, tier)) as SupportTier;
}

// ---------- Pillar 1: Study & Homework Session steps ----------

export interface TierDecision {
  nextTier: SupportTier;
  changed: boolean;
  direction: "escalate" | "fade" | "none";
  reason: string;
  requiresParentApproval: boolean;
}

/**
 * recentOutcomes: oldest -> newest, for ONE step, across attempts.
 * "break" outcomes are ignored for streak purposes -- taking a
 * break is never treated as struggle or success.
 */
export function decideStepTier(
  currentTier: SupportTier,
  recentOutcomes: StepOutcome[]
): TierDecision {
  const scored = recentOutcomes.filter((o) => o !== "break");

  const lastStruggle = scored.slice(-ESCALATE_AFTER);
  if (
    lastStruggle.length === ESCALATE_AFTER &&
    lastStruggle.every((o) => o === "need_help") &&
    currentTier < MAX_TIER
  ) {
    return {
      nextTier: clampTier(currentTier + 1),
      changed: true,
      direction: "escalate",
      reason: `Needed help on this step ${ESCALATE_AFTER} times in a row -- adding a more detailed prompt.`,
      requiresParentApproval: false,
    };
  }

  const lastSuccess = scored.slice(-FADE_AFTER);
  if (
    lastSuccess.length === FADE_AFTER &&
    lastSuccess.every((o) => o === "done") &&
    currentTier > MIN_TIER
  ) {
    return {
      nextTier: clampTier(currentTier - 1),
      changed: true,
      direction: "fade",
      reason: `Completed this step independently ${FADE_AFTER} times in a row -- offering to reduce support.`,
      requiresParentApproval: true,
    };
  }

  return {
    nextTier: currentTier,
    changed: false,
    direction: "none",
    reason: "No change -- not enough of a pattern yet.",
    requiresParentApproval: false,
  };
}

// ---------- Pillar 2: Review Cards (adaptive retrieval practice) ----------

export interface ReviewCardState {
  supportTier: SupportTier;
  intervalDays: number;
  correctStreak: number;
  struggleStreak: number;
}

export interface ReviewDecision {
  nextTier: SupportTier;
  nextIntervalDays: number;
  nextCorrectStreak: number;
  nextStruggleStreak: number;
  reason: string;
  requiresParentApproval: boolean;
}

export function decideReviewCard(
  current: ReviewCardState,
  outcome: CardOutcome
): ReviewDecision {
  const { supportTier, intervalDays } = current;

  if (outcome !== "correct") {
    const struggleStreak = current.struggleStreak + 1;
    const escalate = struggleStreak >= CARD_ESCALATE_AFTER && supportTier < MAX_TIER;
    return {
      nextTier: escalate ? clampTier(supportTier + 1) : supportTier,
      nextIntervalDays: Math.max(
        BASE_INTERVAL_DAYS,
        Math.round(intervalDays * INTERVAL_SHRINK_ON_INCORRECT)
      ),
      nextCorrectStreak: 0,
      nextStruggleStreak: struggleStreak,
      reason: escalate
        ? `Missed this card ${CARD_ESCALATE_AFTER} times in a row -- adding more support and reviewing it sooner.`
        : "Missed this card -- reviewing it sooner.",
      requiresParentApproval: false,
    };
  }

  const correctStreak = current.correctStreak + 1;
  const fade = correctStreak >= CARD_FADE_AFTER && supportTier > MIN_TIER;
  if (fade) {
    return {
      nextTier: clampTier(supportTier - 1),
      nextIntervalDays: intervalDays, // only one adjustment per attempt
      nextCorrectStreak: 0,
      nextStruggleStreak: 0,
      reason: `Answered correctly ${CARD_FADE_AFTER} times in a row with support -- reducing support before spacing it out further.`,
      requiresParentApproval: true,
    };
  }

  return {
    nextTier: supportTier,
    nextIntervalDays: Math.min(
      MAX_INTERVAL_DAYS,
      Math.round(intervalDays * INTERVAL_GROWTH_ON_CORRECT)
    ),
    nextCorrectStreak: correctStreak,
    nextStruggleStreak: 0,
    reason: "Answered correctly -- spacing this card out further.",
    requiresParentApproval: false,
  };
}
