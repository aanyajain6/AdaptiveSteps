import { decideStepTier, decideReviewCard, ReviewCardState } from "../lib/adaptiveEngine";

describe("decideStepTier", () => {
  it("does nothing on too short a history", () => {
    const result = decideStepTier(0, ["need_help", "need_help"]);
    expect(result.changed).toBe(false);
  });

  it("escalates support after 3 consecutive need_help", () => {
    const result = decideStepTier(0, ["need_help", "need_help", "need_help"]);
    expect(result.changed).toBe(true);
    expect(result.direction).toBe("escalate");
    expect(result.nextTier).toBe(1);
    expect(result.requiresParentApproval).toBe(false);
  });

  it("does not escalate past the max tier", () => {
    const result = decideStepTier(3, ["need_help", "need_help", "need_help"]);
    expect(result.changed).toBe(false);
    expect(result.nextTier).toBe(3);
  });

  it("offers to fade support after 5 consecutive independent completions", () => {
    const result = decideStepTier(2, ["done", "done", "done", "done", "done"]);
    expect(result.changed).toBe(true);
    expect(result.direction).toBe("fade");
    expect(result.nextTier).toBe(1);
    expect(result.requiresParentApproval).toBe(true);
  });

  it("does not fade below the minimum tier", () => {
    const result = decideStepTier(0, ["done", "done", "done", "done", "done"]);
    expect(result.changed).toBe(false);
  });

  it("ignores breaks entirely -- they don't count as struggle or success", () => {
    const result = decideStepTier(0, ["need_help", "break", "need_help", "break", "need_help"]);
    expect(result.changed).toBe(true);
    expect(result.direction).toBe("escalate");
  });

  it("a mixed recent history (not all the same) changes nothing", () => {
    const result = decideStepTier(1, ["need_help", "done", "need_help"]);
    expect(result.changed).toBe(false);
  });

  it("only looks at the most recent window, not the whole history", () => {
    // 3 old need_helps, then 3 recent independent dones -- should NOT escalate
    const result = decideStepTier(
      0,
      ["need_help", "need_help", "need_help", "done", "done", "done"]
    );
    expect(result.direction).not.toBe("escalate");
  });
});

describe("decideReviewCard", () => {
  const base: ReviewCardState = {
    supportTier: 0,
    intervalDays: 2,
    correctStreak: 0,
    struggleStreak: 0,
  };

  it("shrinks the interval on a single miss, without escalating support yet", () => {
    const result = decideReviewCard(base, "incorrect");
    expect(result.nextIntervalDays).toBe(1); // max(1, round(2 * 0.5))
    expect(result.nextTier).toBe(0);
    expect(result.nextStruggleStreak).toBe(1);
  });

  it("escalates to more support after 2 consecutive misses", () => {
    const afterFirstMiss = decideReviewCard(base, "incorrect");
    const afterSecondMiss = decideReviewCard(
      { ...base, struggleStreak: afterFirstMiss.nextStruggleStreak },
      "incorrect"
    );
    expect(afterSecondMiss.nextTier).toBe(1);
    expect(afterSecondMiss.requiresParentApproval).toBe(false);
  });

  it("never escalates support past the max tier", () => {
    const atMax: ReviewCardState = { ...base, supportTier: 3, struggleStreak: 1 };
    const result = decideReviewCard(atMax, "incorrect");
    expect(result.nextTier).toBe(3);
  });

  it("grows the interval on a correct answer", () => {
    const result = decideReviewCard(base, "correct");
    expect(result.nextIntervalDays).toBe(4); // round(2 * 2.0)
    expect(result.nextCorrectStreak).toBe(1);
  });

  it("caps the interval at the maximum", () => {
    const result = decideReviewCard({ ...base, intervalDays: 50 }, "correct");
    expect(result.nextIntervalDays).toBeLessThanOrEqual(60);
  });

  it("offers to fade support after 3 consecutive correct answers WITH support, and requires approval", () => {
    const withSupport: ReviewCardState = { ...base, supportTier: 2, correctStreak: 2 };
    const result = decideReviewCard(withSupport, "correct");
    expect(result.nextTier).toBe(1);
    expect(result.requiresParentApproval).toBe(true);
  });

  it("a correct answer resets the struggle streak", () => {
    const strugglingThenCorrect: ReviewCardState = { ...base, struggleStreak: 1 };
    const result = decideReviewCard(strugglingThenCorrect, "correct");
    expect(result.nextStruggleStreak).toBe(0);
  });

  it("a missed answer resets the correct streak", () => {
    const succeedingThenMiss: ReviewCardState = { ...base, correctStreak: 2 };
    const result = decideReviewCard(succeedingThenMiss, "incorrect");
    expect(result.nextCorrectStreak).toBe(0);
  });
});
