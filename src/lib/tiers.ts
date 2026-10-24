import { SupportTier } from "../types/models";

// Parent-facing names for support tiers -- the dashboard and editors
// never show a bare number.
export const TIER_LABELS: Record<SupportTier, string> = {
  0: "Independent",
  1: "Reminder",
  2: "Picture + voice",
  3: "Full support",
};

export const TIER_DESCRIPTIONS: Record<SupportTier, string> = {
  0: "Just the step.",
  1: "The step plus your reminder text.",
  2: "Adds the photo (shown large) and reads everything aloud.",
  3: "Everything at once, read aloud twice -- hard to get wrong while learning.",
};

/** New steps start with a gentle reminder; the engine adjusts from there. */
export const DEFAULT_STEP_TIER: SupportTier = 1;

// Review cards use the same tiers with card-specific meaning.
export const CARD_TIER_LABELS: Record<SupportTier, string> = {
  0: "Recall on own",
  1: "Hint if wanted",
  2: "Hint shown",
  3: "Answer shown",
};

/** New cards start with a hint available; the engine adjusts from there. */
export const DEFAULT_CARD_TIER: SupportTier = 1;
