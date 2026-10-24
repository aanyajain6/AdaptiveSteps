import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  adaptStep,
  approveAdjustment,
  declineAdjustment,
  outcomesForStep,
  recordReview,
} from "../lib/adaptation";
import * as db from "../lib/db";
import { ReviewCard, SessionAttempt, StepOutcome, StudySession, SupportTier } from "../types/models";

jest.mock("react-native-get-random-values", () => ({}));

const CHILD = "child-1";
const STEP = "step-1";

// Minute-spaced timestamps so ordering is unambiguous.
const t = (n: number) => new Date(Date.UTC(2026, 0, 1, 0, n)).toISOString();

function session(tier: SupportTier): StudySession {
  return {
    id: "session-1",
    childId: CHILD,
    title: "Math",
    subject: "Math",
    steps: [{ id: STEP, label: "Read the problem", supportTier: tier }],
    createdAt: t(0),
  };
}

let clock = 1;

/** Logs one attempt at the step at the session's current tier, then runs adaptation. */
async function attempt(outcome: StepOutcome) {
  const s = (await db.getSession("session-1"))!;
  const now = t(clock++);
  const a: SessionAttempt = {
    id: db.newId(),
    sessionId: s.id,
    childId: CHILD,
    startedAt: now,
    stepLogs: [
      { stepId: STEP, outcome, msElapsed: 1000, supportTierAtAttempt: s.steps[0].supportTier, timestamp: now },
    ],
  };
  await db.saveSessionAttempt(a);
  return adaptStep(s.id, STEP, now);
}

const tierNow = async () => (await db.getSession("session-1"))!.steps[0].supportTier;

beforeEach(async () => {
  await AsyncStorage.clear();
  clock = 1;
});

describe("outcomesForStep", () => {
  it("ignores logs from a different tier", () => {
    const attempts: SessionAttempt[] = [
      {
        id: "a", sessionId: "s", childId: CHILD, startedAt: t(1),
        stepLogs: [
          { stepId: STEP, outcome: "need_help", msElapsed: 0, supportTierAtAttempt: 0, timestamp: t(1) },
          { stepId: STEP, outcome: "done", msElapsed: 0, supportTierAtAttempt: 1, timestamp: t(2) },
        ],
      },
    ];
    expect(outcomesForStep(attempts, STEP, 1, [])).toEqual(["done"]);
  });
});

describe("adaptStep", () => {
  it("escalates immediately and logs an approved adjustment", async () => {
    await db.saveSession(session(0));
    await attempt("need_help");
    await attempt("need_help");
    const { adjustment } = await attempt("need_help");

    expect(await tierNow()).toBe(1);
    expect(adjustment?.status).toBe("approved");
    expect(adjustment?.reason).toMatch(/help/i);
  });

  it("does not re-escalate on the same history after a change", async () => {
    await db.saveSession(session(0));
    for (let i = 0; i < 3; i++) await attempt("need_help");
    await attempt("need_help");
    expect(await tierNow()).toBe(1);
  });

  it("never treats breaks as struggle", async () => {
    await db.saveSession(session(0));
    for (let i = 0; i < 6; i++) await attempt("break");
    expect(await tierNow()).toBe(0);
    expect(await db.listAdjustments(CHILD)).toHaveLength(0);
  });

  it("writes a single pending fade instead of reducing support", async () => {
    await db.saveSession(session(2));
    for (let i = 0; i < 7; i++) await attempt("done");

    expect(await tierNow()).toBe(2);
    const pending = await db.listPendingApprovals(CHILD);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ fromTier: 2, toTier: 1, status: "pending" });
  });

  it("applies the fade only once the parent approves", async () => {
    await db.saveSession(session(2));
    for (let i = 0; i < 5; i++) await attempt("done");
    const [pending] = await db.listPendingApprovals(CHILD);

    expect(await approveAdjustment(pending, t(100))).toBe(true);
    expect(await tierNow()).toBe(1);
    expect(await db.listPendingApprovals(CHILD)).toHaveLength(0);
  });

  it("restarts the count after a decline", async () => {
    await db.saveSession(session(2));
    for (let i = 0; i < 5; i++) await attempt("done");
    const [pending] = await db.listPendingApprovals(CHILD);
    await declineAdjustment(pending, t(clock++));

    for (let i = 0; i < 4; i++) await attempt("done");
    expect(await db.listPendingApprovals(CHILD)).toHaveLength(0);
    await attempt("done");
    expect(await db.listPendingApprovals(CHILD)).toHaveLength(1);
  });

  it("supersedes a pending fade when support has to go up instead", async () => {
    await db.saveSession(session(2));
    for (let i = 0; i < 5; i++) await attempt("done");
    const [pending] = await db.listPendingApprovals(CHILD);
    for (let i = 0; i < 3; i++) await attempt("need_help");

    expect(await tierNow()).toBe(3);
    expect(await db.listPendingApprovals(CHILD)).toHaveLength(0);
    // A stale approval must not drop the step from 3 straight to 1.
    expect(await approveAdjustment(pending, t(200))).toBe(false);
    expect(await tierNow()).toBe(3);
  });
});

describe("recordReview", () => {
  const card = (tier: SupportTier): ReviewCard => ({
    id: "card-1", childId: CHILD, subject: "Math", front: "7 x 8", back: "56",
    supportTier: tier, intervalDays: 1, dueAt: t(0), correctStreak: 0, struggleStreak: 0,
    createdAt: t(0),
  });

  it("reschedules by the engine's interval and logs the attempt", async () => {
    const updated = await recordReview(card(0), "correct", t(10));
    expect(updated.intervalDays).toBe(2);
    expect(Date.parse(updated.dueAt) - Date.parse(t(10))).toBe(2 * 24 * 60 * 60 * 1000);
    expect(await db.listReviewAttempts(CHILD)).toHaveLength(1);
  });

  it("holds a tier reduction for approval but keeps spacing updates", async () => {
    let c = card(2);
    await db.saveReviewCard(c);
    for (let i = 0; i < 3; i++) c = await recordReview(c, "correct", t(10 + i));

    expect(c.supportTier).toBe(2);
    expect(c.correctStreak).toBe(0);
    const pending = await db.listPendingApprovals(CHILD);
    expect(pending).toHaveLength(1);

    await approveAdjustment(pending[0], t(20));
    expect((await db.listReviewCards(CHILD))[0].supportTier).toBe(1);
  });

  it("escalates a card immediately", async () => {
    let c = card(0);
    c = await recordReview(c, "incorrect", t(10));
    c = await recordReview(c, "needed_support", t(11));
    expect(c.supportTier).toBe(1);
    expect((await db.listAdjustments(CHILD))[0].status).toBe("approved");
  });
});
