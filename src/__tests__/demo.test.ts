import AsyncStorage from "@react-native-async-storage/async-storage";
import { adaptStep, outcomesForStep } from "../lib/adaptation";
import * as db from "../lib/db";
import { seedDemoIfNeeded } from "../lib/demo";

jest.mock("react-native-get-random-values", () => ({}));

const NOW = "2026-10-25T12:00:00.000Z";

beforeEach(() => AsyncStorage.clear());

describe("seedDemoIfNeeded", () => {
  it("does nothing when the demo flag is off", async () => {
    expect(await seedDemoIfNeeded(NOW, false)).toBe(false);
    expect(await db.listChildren()).toHaveLength(0);
  });

  it("seeds one learner, one session, cards with some due, and makes it active", async () => {
    expect(await seedDemoIfNeeded(NOW, true)).toBe(true);
    const [child] = await db.listChildren();
    expect(await db.getActiveChildId()).toBe(child.id);
    expect(await db.listSessions(child.id)).toHaveLength(1);
    expect((await db.listDueReviewCards(child.id, NOW)).length).toBeGreaterThan(0);
  });

  it("seeds only once, even after the demo is deleted", async () => {
    await seedDemoIfNeeded(NOW, true);
    const [child] = await db.listChildren();
    await db.deleteChildAndData(child.id);
    expect(await seedDemoIfNeeded(NOW, true)).toBe(false);
    expect(await db.listChildren()).toHaveLength(0);
  });

  it("never mixes demo data into a device that already has a profile", async () => {
    await db.saveChild({
      id: "real", name: "Real", ageBand: "7-9", preferredFormat: "text",
      reduceAnimations: false, highContrast: false, textScale: 1, createdAt: NOW,
    });
    expect(await seedDemoIfNeeded(NOW, true)).toBe(false);
    expect((await db.listChildren()).map((c) => c.id)).toEqual(["real"]);
  });

  it("writes history the real engine agrees with", async () => {
    await seedDemoIfNeeded(NOW, true);
    const [child] = await db.listChildren();
    const [session] = await db.listSessions(child.id);
    const attempts = await db.listSessionAttempts(child.id);
    const adjustments = await db.listAdjustments(child.id);
    const first = session.steps[0];

    // The seeded pending fade is backed by 5 independent completions at its tier...
    const firstAdj = adjustments.filter((a) => a.itemId === first.id);
    expect(outcomesForStep(attempts, first.id, first.supportTier, firstAdj)).toEqual(["done", "done", "done", "done", "done"]);
    // ...and running the engine again doesn't stack a second one.
    await adaptStep(session.id, first.id, NOW);
    expect((await db.listPendingApprovals(child.id)).filter((a) => a.itemId === first.id)).toHaveLength(1);
  });
});
