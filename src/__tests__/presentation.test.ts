import { boostedTier, presentStep } from "../lib/presentation";

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
