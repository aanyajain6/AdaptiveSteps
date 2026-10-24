import AsyncStorage from "@react-native-async-storage/async-storage";
import * as db from "../lib/db";

jest.mock("react-native-get-random-values", () => ({}));

beforeEach(() => (AsyncStorage as unknown as { clear: () => Promise<void> }).clear());

describe("deleteChildAndData", () => {
  it("removes the child's records and leaves other children's alone", async () => {
    const now = new Date(0).toISOString();
    for (const childId of ["a", "b"]) {
      await db.saveChild({
        id: childId, name: childId, ageBand: "7-9", preferredFormat: "text",
        reduceAnimations: false, highContrast: false, textScale: 1, createdAt: now,
      });
      await db.saveSession({ id: `s-${childId}`, childId, title: "t", subject: "s", steps: [], createdAt: now });
      await db.saveReviewCard({
        id: `c-${childId}`, childId, subject: "s", front: "f", back: "b", supportTier: 0,
        intervalDays: 1, dueAt: now, correctStreak: 0, struggleStreak: 0, createdAt: now,
      });
    }

    await db.deleteChildAndData("a");

    expect((await db.listChildren()).map((c) => c.id)).toEqual(["b"]);
    expect((await db.listSessions()).map((s) => s.childId)).toEqual(["b"]);
    expect((await db.listReviewCards()).map((c) => c.childId)).toEqual(["b"]);
  });
});
