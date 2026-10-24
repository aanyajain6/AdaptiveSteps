// ============================================================
// Core data model for AdaptiveSteps
// ============================================================
// No diagnosis or medical fields anywhere in this file, on purpose.
// The adaptive engine responds to how a child actually performs on
// a given skill/step -- never to a diagnostic label. This mirrors
// MTSS (Multi-Tiered System of Supports): support level is set by
// measured response, and can differ per skill for the same child.

export type PreferredFormat = "picture" | "text" | "voice";

// Tier 0 = independent, no extra support.
// Tier 1 = text/visual reminder shown.
// Tier 2 = picture or audio prompt shown.
// Tier 3 = errorless mode: answer/support shown alongside the prompt,
//          so the child essentially cannot get it wrong while learning it.
export type SupportTier = 0 | 1 | 2 | 3;

// UDL-style presentation settings: HOW content is shown.
// Set once by a parent/teacher per child. Separate on purpose from
// SupportTier, which is WHETHER the engine adapts how much help is given.
export interface ChildProfile {
  id: string;
  name: string;
  ageBand: "4-6" | "7-9" | "10-12" | "13+";
  preferredFormat: PreferredFormat;
  reduceAnimations: boolean;
  highContrast: boolean;
  textScale: number; // 1.0 = default, e.g. 1.5 = 150%
  createdAt: string;
}

// ---------- Pillar 1: Study & Homework Sessions ----------

export interface SessionStep {
  id: string;
  label: string; // e.g. "Read the assignment prompt"
  photoUri?: string;
  hint?: string; // parent-written reminder, shown from tier 1 up
  subjectTag?: string;
  supportTier: SupportTier;
}

export interface StudySession {
  id: string;
  childId: string;
  title: string; // e.g. "Math homework - fractions worksheet"
  subject: string; // free text: "Math", "Reading", etc.
  steps: SessionStep[];
  createdAt: string;
}

export type StepOutcome = "done" | "need_help" | "break";

// Nonverbal responses from the runner's choice board. Logged as
// communication, never scored -- except "help", which counts the
// same as tapping Need Help.
export type ChoiceResponse = "yes" | "no" | "more_time" | "help";

// Self-reported check-in before/after a session. Shown to the parent
// as context only; the adaptive engine never reads it.
export type Mood = "happy" | "okay" | "worried" | "upset" | "tired";

export interface SessionAttempt {
  id: string;
  sessionId: string;
  childId: string;
  startedAt: string;
  completedAt?: string;
  moodBefore?: Mood;
  moodAfter?: Mood;
  stepLogs: {
    stepId: string;
    outcome: StepOutcome;
    msElapsed: number;
    supportTierAtAttempt: SupportTier;
    timestamp: string;
    helpRequests?: number; // how many prompts were needed on this step
    choices?: ChoiceResponse[];
  }[];
}

// ---------- Pillar 2: Review Cards (adaptive retrieval practice) ----------

export interface ReviewCard {
  id: string;
  childId: string;
  subject: string; // "Spelling", "Math facts", etc.
  front: string; // the prompt, e.g. "7 x 8"
  back: string; // the answer, e.g. "56"
  frontPhotoUri?: string;
  supportTier: SupportTier; // 3 = errorless (shown paired), 0-1 = real recall
  intervalDays: number; // current spacing interval
  dueAt: string; // ISO date -- when this card should next appear
  correctStreak: number;
  struggleStreak: number;
  createdAt: string;
}

export type CardOutcome = "correct" | "incorrect" | "needed_support";

export interface ReviewAttempt {
  id: string;
  cardId: string;
  childId: string;
  outcome: CardOutcome;
  supportTierAtAttempt: SupportTier;
  timestamp: string;
}

// ---------- Shared: explainable adjustment log ----------
// Every time the engine changes a step's or card's support tier,
// it writes one of these -- so a parent can always see *why*.

export type AdaptiveItemType = "session_step" | "review_card";

// "superseded" = a pending fade that became moot because the item
// changed tier for another reason before the parent responded.
export type AdjustmentStatus = "pending" | "approved" | "declined" | "superseded";

export interface AdaptiveAdjustment {
  id: string;
  childId: string;
  itemType: AdaptiveItemType;
  itemId: string;
  fromTier: SupportTier;
  toTier: SupportTier;
  reason: string; // plain language, shown to the parent
  requiresParentApproval: boolean; // true when lowering support (fading)
  approved: boolean;
  status?: AdjustmentStatus; // absent on records written before this field existed
  resolvedAt?: string;
  createdAt: string;
}
