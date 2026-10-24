import {
  hardestSteps,
  independentCompletion,
  mastery,
  promptsPerAttempt,
  weeklyRetention,
} from "../lib/stats";
import { ReviewAttempt, ReviewCard, SessionAttempt, StepOutcome, StudySession } from "../types/models";

const at = (day: number) => new Date(Date.UTC(2026, 0, 5 + day)).toISOString(); // 2026-01-05 is a Monday

function attempt(id: string, day: number, logs: [string, StepOutcome, number?][]): SessionAttempt {
  return {
    id, sessionId: "s", childId: "c", startedAt: at(day),
    stepLogs: logs.map(([stepId, outcome, helpRequests]) => ({
      stepId, outcome, helpRequests, msElapsed: 0, supportTierAtAttempt: 1, timestamp: at(day),
    })),
  };
}

const session: StudySession = {
  id: "s", childId: "c", title: "Homework", subject: "", createdAt: at(0),
  steps: [
    { id: "a", label: "Get worksheet", supportTier: 1 },
    { id: "b", label: "Do problems", supportTier: 1 },
  ],
};

describe("promptsPerAttempt", () => {
  it("sums help requests per attempt in time order and skips break-only attempts", () => {
    const points = promptsPerAttempt([
      attempt("2", 2, [["a", "done"], ["b", "need_help", 2]]),
      attempt("1", 1, [["a", "need_help", 1], ["b", "need_help", 1]]),
      attempt("x", 3, [["a", "break"]]),
    ]);
    expect(points.map((p) => [p.attemptId, p.prompts])).toEqual([["1", 2], ["2", 2]]);
  });
});

describe("independentCompletion", () => {
  it("ignores breaks", () => {
    const r = independentCompletion([attempt("1", 0, [["a", "done"], ["a", "break"], ["b", "need_help"]])]);
    expect(r).toEqual({ independent: 1, total: 2, rate: 0.5 });
  });

  it("returns null rate with no data", () => {
    expect(independentCompletion([]).rate).toBeNull();
  });
});

describe("hardestSteps", () => {
  it("ranks by help rate and skips deleted steps and steps never needing help", () => {
    const steps = hardestSteps(
      [
        attempt("1", 0, [["a", "need_help"], ["b", "done"], ["gone", "need_help"]]),
        attempt("2", 1, [["a", "done"], ["b", "done"]]),
      ],
      [session]
    );
    expect(steps).toEqual([
      { stepId: "a", label: "Get worksheet", sessionTitle: "Homework", helpRate: 0.5, attempts: 2 },
    ]);
  });
});

describe("weeklyRetention", () => {
  const review = (day: number, outcome: ReviewAttempt["outcome"]): ReviewAttempt => ({
    id: `${day}${outcome}`, cardId: "k", childId: "c", outcome, supportTierAtAttempt: 0, timestamp: at(day),
  });

  it("groups by Monday-start week and counts only unsupported correct answers", () => {
    const weeks = weeklyRetention([
      review(0, "correct"), review(6, "needed_support"), // week of Jan 5
      review(7, "correct"), review(8, "correct"),        // week of Jan 12
    ]);
    expect(weeks).toEqual([
      { weekStart: "2026-01-05", rate: 0.5, reviews: 2 },
      { weekStart: "2026-01-12", rate: 1, reviews: 2 },
    ]);
  });
});

describe("mastery", () => {
  it("counts unsupported cards spaced a week or more", () => {
    const card = (supportTier: 0 | 1, intervalDays: number) => ({ supportTier, intervalDays }) as ReviewCard;
    expect(mastery([card(0, 8), card(0, 4), card(1, 16)])).toEqual({ mastered: 1, total: 3 });
  });
});
