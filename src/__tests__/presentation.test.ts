import { boostedTier, nextUnfinished, presentCard, presentStep, stepStatuses } from "../lib/presentation";

const step = { label: "Get your worksheet", hint: "It's in the blue folder", photoUri: "file:///p.jpg" };

describe("presentStep", () => {
  it("tier 0 shows only the label, read aloud once", () => {
    expect(presentStep(step, 0, "text")).toEqual({
      showHint: false,
      photo: "none",
      narration: ["Get your worksheet"],
    });
  });

  it("tier 1 shows the reminder without reading it (text preference)", () => {
    const p = presentStep(step, 1, "text");
    expect(p.showHint).toBe(true);
    expect(p.narration).toEqual(["Get your worksheet"]);
  });

  it("voice preference reads the reminder aloud at tier 1", () => {
    expect(presentStep(step, 1, "voice").narration).toEqual([step.label, step.hint]);
  });

  it("picture preference shows the photo small even at low tiers", () => {
    expect(presentStep(step, 0, "picture").photo).toBe("small");
    expect(presentStep(step, 0, "text").photo).toBe("none");
  });

  it("tier 2 shows the photo large and reads everything", () => {
    const p = presentStep(step, 2, "text");
    expect(p.photo).toBe("large");
    expect(p.narration).toEqual([step.label, step.hint]);
  });

  it("tier 3 repeats the full prompt", () => {
    expect(presentStep(step, 3, "text").narration).toEqual([step.label, step.hint, step.label, step.hint]);
  });

  it("handles steps without a hint or photo at any tier", () => {
    const p = presentStep({ label: "Stretch" }, 3, "picture");
    expect(p).toEqual({ showHint: false, photo: "none", narration: ["Stretch", "Stretch"] });
  });
});

describe("boostedTier", () => {
  it("raises one level per help request, capped at full support", () => {
    expect(boostedTier(0, 0)).toBe(0);
    expect(boostedTier(1, 1)).toBe(2);
    expect(boostedTier(2, 5)).toBe(3);
  });
});

describe("presentCard", () => {
  it("tier 0 is pure recall", () => {
    expect(presentCard("56", 0)).toMatchObject({ hintShown: false, hintOffered: false, answerShownWithPrompt: false });
  });

  it("tier 1 offers a hint, tier 2 shows it", () => {
    expect(presentCard("Paris", 1)).toMatchObject({ hintShown: false, hintOffered: true, hint: "P…" });
    expect(presentCard("Paris", 2)).toMatchObject({ hintShown: true, hintOffered: false });
  });

  it("tier 3 shows the answer with the prompt (errorless)", () => {
    expect(presentCard("56", 3).answerShownWithPrompt).toBe(true);
  });

  it("never offers an empty hint", () => {
    expect(presentCard("  ", 2)).toMatchObject({ hintShown: false, hintOffered: false });
  });
});

describe("stepStatuses", () => {
  const ids = ["a", "b", "c", "d"];

  it("marks finished steps Done (even when help was needed) and ignores breaks", () => {
    const logs = [
      { stepId: "a", outcome: "need_help" as const },
      { stepId: "b", outcome: "break" as const },
    ];
    expect(stepStatuses(ids, logs, 1, 0)).toEqual(["done", "in_progress", "not_started", "not_started"]);
  });

  it("shows Needs Help only on the current step after a help request", () => {
    expect(stepStatuses(ids, [], 2, 1)).toEqual(["not_started", "not_started", "needs_help", "not_started"]);
  });
});

describe("nextUnfinished", () => {
  it("moves forward to the next unfinished step", () => {
    expect(nextUnfinished(["done", "done", "not_started", "not_started"], 1)).toBe(2);
  });

  it("wraps around to steps skipped earlier", () => {
    expect(nextUnfinished(["not_started", "done", "done", "done"], 3)).toBe(0);
  });

  it("returns null when every step is done", () => {
    expect(nextUnfinished(["done", "done"], 1)).toBeNull();
  });
});
