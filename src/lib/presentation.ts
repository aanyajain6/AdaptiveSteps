// ============================================================
// What the runner shows for a step
// ============================================================
// Two separate inputs, kept separate on purpose:
//  - support tier (MTSS): HOW MUCH help is shown, from performance.
//  - preferred format (UDL): HOW it's shown, set by the parent.
// Pure, so the tier rules are unit-tested rather than buried in UI.

import { PreferredFormat, SessionStep, SupportTier } from "../types/models";

export interface StepPresentation {
  showHint: boolean;
  photo: "none" | "small" | "large";
  /** Lines read aloud on entering the step, in order. */
  narration: string[];
}

export function presentStep(
  step: Pick<SessionStep, "label" | "hint" | "photoUri">,
  tier: SupportTier,
  format: PreferredFormat
): StepPresentation {
  const hasHint = !!step.hint;
  const showHint = hasHint && tier >= 1;

  let photo: StepPresentation["photo"] = "none";
  if (step.photoUri) {
    if (tier >= 2) photo = "large";
    else if (format === "picture") photo = "small";
  }

  // The label is always read aloud. The hint is read from tier 2 up,
  // or whenever it's shown to a child who prefers voice.
  const narration = [step.label];
  if (showHint && (tier >= 2 || format === "voice")) narration.push(step.hint!);
  // Tier 3 (errorless): repeat the whole prompt once.
  if (tier === 3) narration.push(...narration);

  return { showHint, photo, narration };
}

/**
 * Tapping Need Help raises the support shown for *this* step right
 * now, one level per tap. It doesn't change the stored tier; that
 * is the engine's call across attempts.
 */
export function boostedTier(stored: SupportTier, helpRequests: number): SupportTier {
  return Math.min(3, stored + helpRequests) as SupportTier;
}

// ---------- Review cards ----------

export interface CardPresentation {
  /** Hint shown as soon as the card appears. */
  hintShown: boolean;
  /** A "Show a hint" button is offered. */
  hintOffered: boolean;
  /** Errorless: the answer appears with the question. */
  answerShownWithPrompt: boolean;
  hint: string;
}

/** First letter (or digit) of the answer, e.g. "56" -> "5…". */
export function answerHint(back: string): string {
  const trimmed = back.trim();
  return trimmed ? `${trimmed[0]}…` : "";
}

export function presentCard(back: string, tier: SupportTier): CardPresentation {
  const hint = answerHint(back);
  return {
    hintShown: tier >= 2 && !!hint,
    hintOffered: tier === 1 && !!hint,
    answerShownWithPrompt: tier === 3,
    hint,
  };
}
