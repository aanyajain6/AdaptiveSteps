// ============================================================
// Dashboard metrics
// ============================================================
// Pure functions over stored records -- the dashboard only draws
// what these return. Breaks are excluded everywhere: they are
// neither success nor struggle.

import { ReviewAttempt, ReviewCard, SessionAttempt, StudySession } from "../types/models";

type StepLog = SessionAttempt["stepLogs"][number];

/** A card counts as mastered once it's recalled with no support and spaced a week or more apart. */
export const MASTERY_INTERVAL_DAYS = 7;

function scoredLogs(attempt: SessionAttempt): StepLog[] {
  return attempt.stepLogs.filter((l) => l.outcome !== "break");
}

function byStart(a: SessionAttempt, b: SessionAttempt) {
  return a.startedAt.localeCompare(b.startedAt);
}

export interface AttemptPoint {
  attemptId: string;
  date: string; // ISO
  prompts: number;
}

/** Total help requests (prompts) in each attempt that reached at least one step, oldest first. */
export function promptsPerAttempt(attempts: SessionAttempt[], limit = 10): AttemptPoint[] {
  return [...attempts]
    .filter((a) => scoredLogs(a).length > 0)
    .sort(byStart)
    .slice(-limit)
    .map((a) => ({
      attemptId: a.id,
      date: a.startedAt,
      prompts: scoredLogs(a).reduce((sum, l) => sum + (l.helpRequests ?? (l.outcome === "need_help" ? 1 : 0)), 0),
    }));
}

export interface Rate {
  independent: number;
  total: number;
  /** 0..1, or null with no data */
  rate: number | null;
}

/** Share of completed steps finished without asking for help. */
export function independentCompletion(attempts: SessionAttempt[]): Rate {
  const logs = attempts.flatMap(scoredLogs);
  const independent = logs.filter((l) => l.outcome === "done").length;
  return { independent, total: logs.length, rate: logs.length ? independent / logs.length : null };
}

export interface HardStep {
  stepId: string;
  label: string;
  sessionTitle: string;
  helpRate: number; // 0..1
  attempts: number;
}

/** Steps that most often needed help. Deleted steps are skipped. */
export function hardestSteps(
  attempts: SessionAttempt[],
  sessions: StudySession[],
  limit = 5
): HardStep[] {
  const counts = new Map<string, { help: number; total: number }>();
  for (const log of attempts.flatMap(scoredLogs)) {
    const c = counts.get(log.stepId) ?? { help: 0, total: 0 };
    c.total += 1;
    if (log.outcome === "need_help") c.help += 1;
    counts.set(log.stepId, c);
  }

  const steps = new Map(
    sessions.flatMap((s) => s.steps.map((st) => [st.id, { label: st.label, sessionTitle: s.title }] as const))
  );

  return [...counts.entries()]
    .filter(([id, c]) => steps.has(id) && c.help > 0)
    .map(([id, c]) => ({ stepId: id, ...steps.get(id)!, helpRate: c.help / c.total, attempts: c.total }))
    .sort((a, b) => b.helpRate - a.helpRate || b.attempts - a.attempts)
    .slice(0, limit);
}

export interface WeekPoint {
  weekStart: string; // ISO date (Monday, UTC)
  rate: number; // 0..1 correct without support
  reviews: number;
}

function weekStart(iso: string): string {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}

/** Weekly retention: share of reviews answered correctly. Weeks without reviews are omitted. */
export function weeklyRetention(reviews: ReviewAttempt[], limit = 8): WeekPoint[] {
  const weeks = new Map<string, { correct: number; total: number }>();
  for (const r of reviews) {
    const key = weekStart(r.timestamp);
    const w = weeks.get(key) ?? { correct: 0, total: 0 };
    w.total += 1;
    if (r.outcome === "correct") w.correct += 1;
    weeks.set(key, w);
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([key, w]) => ({ weekStart: key, rate: w.correct / w.total, reviews: w.total }));
}

export function mastery(cards: ReviewCard[]): { mastered: number; total: number } {
  return {
    mastered: cards.filter((c) => c.supportTier === 0 && c.intervalDays >= MASTERY_INTERVAL_DAYS).length,
    total: cards.length,
  };
}
