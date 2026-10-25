// ============================================================
// What the runner shows for a step
// ============================================================
// Two separate inputs, kept separate on purpose:
//  - support tier (MTSS): HOW MUCH help is shown, from performance.
//  - preferred format (UDL): HOW it's shown, set by the parent.
// Pure, so the tier rules are unit-tested rather than buried in UI.

import { PreferredFormat, SessionStep, StepOutcome, SupportTier } from "../types/models";

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

// ---------- Step status (stepper + status rows) ----------

/** Progress within the current run. Support level is a separate axis, never mixed in here. */
export type StepStatus = "not_started" | "in_progress" | "needs_help" | "done";

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  needs_help: "Needs Help",
  done: "Done",
};

/**
 * Status of every step in this run. A step is Done once it has a
 * finishing log (done or need_help) -- finishing with help is still
 * Done. "Needs Help" only describes the step being worked on right now.
 */
export function stepStatuses(
  stepIds: string[],
  logs: { stepId: string; outcome: StepOutcome }[],
  currentIndex: number,
  currentHelpRequests: number
): StepStatus[] {
  const finished = new Set(logs.filter((l) => l.outcome !== "break").map((l) => l.stepId));
  return stepIds.map((id, i) => {
    if (finished.has(id)) return "done";
    if (i === currentIndex) return currentHelpRequests > 0 ? "needs_help" : "in_progress";
    return "not_started";
  });
}

/** Where to go after finishing step `from`: the next unfinished step, wrapping around; null when all are done. */
export function nextUnfinished(statuses: StepStatus[], from: number): number | null {
  for (let k = 1; k <= statuses.length; k++) {
    const i = (from + k) % statuses.length;
    if (statuses[i] !== "done") return i;
  }
  return null;
}
