// ============================================================
// Data access layer
// ============================================================
// Every screen reads/writes through this module, never through
// AsyncStorage directly. The app runs today on on-device storage
// (zero backend setup, works offline, genuinely free) -- but every
// function here has a stable signature. Swapping the body of each
// function to call a cloud database instead is a change contained
// entirely to this one file.

import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import {
  ChildProfile,
  StudySession,
  SessionAttempt,
  ReviewCard,
  ReviewAttempt,
  AdaptiveAdjustment,
} from "../types/models";

const KEYS = {
  children: "adaptivesteps:children",
  sessions: "adaptivesteps:sessions",
  sessionAttempts: "adaptivesteps:sessionAttempts",
  reviewCards: "adaptivesteps:reviewCards",
  reviewAttempts: "adaptivesteps:reviewAttempts",
  adjustments: "adaptivesteps:adjustments",
  parentPin: "adaptivesteps:parentPin",
  activeChildId: "adaptivesteps:activeChildId",
} as const;

async function readAll<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

async function writeAll<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

export function newId(): string {
  return uuidv4();
}

// ---------- Children ----------
export async function listChildren(): Promise<ChildProfile[]> {
  return readAll<ChildProfile>(KEYS.children);
}

export async function getChild(childId: string): Promise<ChildProfile | undefined> {
  const all = await listChildren();
  return all.find((c) => c.id === childId);
}

export async function saveChild(child: ChildProfile): Promise<void> {
  const all = await listChildren();
  const idx = all.findIndex((c) => c.id === child.id);
  if (idx >= 0) all[idx] = child;
  else all.push(child);
  await writeAll(KEYS.children, all);
}

export async function deleteChild(childId: string): Promise<void> {
  const all = await listChildren();
  await writeAll(KEYS.children, all.filter((c) => c.id !== childId));
}

// ---------- Study Sessions ----------
export async function listSessions(childId?: string): Promise<StudySession[]> {
  const all = await readAll<StudySession>(KEYS.sessions);
  return childId ? all.filter((s) => s.childId === childId) : all;
}

export async function getSession(sessionId: string): Promise<StudySession | undefined> {
  const all = await readAll<StudySession>(KEYS.sessions);
  return all.find((s) => s.id === sessionId);
}

export async function saveSession(session: StudySession): Promise<void> {
  const all = await readAll<StudySession>(KEYS.sessions);
  const idx = all.findIndex((s) => s.id === session.id);
  if (idx >= 0) all[idx] = session;
  else all.push(session);
  await writeAll(KEYS.sessions, all);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const all = await readAll<StudySession>(KEYS.sessions);
  await writeAll(KEYS.sessions, all.filter((s) => s.id !== sessionId));
}

// ---------- Session Attempts (what the engine reads for Pillar 1) ----------
export async function listSessionAttempts(childId?: string): Promise<SessionAttempt[]> {
  const all = await readAll<SessionAttempt>(KEYS.sessionAttempts);
  return childId ? all.filter((a) => a.childId === childId) : all;
}

export async function saveSessionAttempt(attempt: SessionAttempt): Promise<void> {
  const all = await readAll<SessionAttempt>(KEYS.sessionAttempts);
  const idx = all.findIndex((a) => a.id === attempt.id);
  if (idx >= 0) all[idx] = attempt;
  else all.push(attempt);
  await writeAll(KEYS.sessionAttempts, all);
}

// ---------- Review Cards ----------
export async function listReviewCards(childId?: string): Promise<ReviewCard[]> {
  const all = await readAll<ReviewCard>(KEYS.reviewCards);
  return childId ? all.filter((c) => c.childId === childId) : all;
}

export async function saveReviewCard(card: ReviewCard): Promise<void> {
  const all = await readAll<ReviewCard>(KEYS.reviewCards);
  const idx = all.findIndex((c) => c.id === card.id);
  if (idx >= 0) all[idx] = card;
  else all.push(card);
  await writeAll(KEYS.reviewCards, all);
}

export async function deleteReviewCard(cardId: string): Promise<void> {
  const all = await readAll<ReviewCard>(KEYS.reviewCards);
  await writeAll(KEYS.reviewCards, all.filter((c) => c.id !== cardId));
}

/** Cards due now or earlier, soonest-due first -- what the Review screen pulls. */
export async function listDueReviewCards(childId: string, nowIso: string): Promise<ReviewCard[]> {
  const all = await listReviewCards(childId);
  return all
    .filter((c) => c.dueAt <= nowIso)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

// ---------- Review Attempts ----------
export async function listReviewAttempts(childId?: string): Promise<ReviewAttempt[]> {
  const all = await readAll<ReviewAttempt>(KEYS.reviewAttempts);
  return childId ? all.filter((a) => a.childId === childId) : all;
}

export async function saveReviewAttempt(attempt: ReviewAttempt): Promise<void> {
  const all = await readAll<ReviewAttempt>(KEYS.reviewAttempts);
  all.push(attempt);
  await writeAll(KEYS.reviewAttempts, all);
}

// ---------- Adaptive adjustments (explainable audit trail) ----------
export async function listAdjustments(childId?: string): Promise<AdaptiveAdjustment[]> {
  const all = await readAll<AdaptiveAdjustment>(KEYS.adjustments);
  return childId ? all.filter((a) => a.childId === childId) : all;
}

export async function saveAdjustment(adj: AdaptiveAdjustment): Promise<void> {
  const all = await readAll<AdaptiveAdjustment>(KEYS.adjustments);
  all.push(adj);
  await writeAll(KEYS.adjustments, all);
}

/** Insert or replace by id -- used when a parent resolves a pending adjustment. */
export async function updateAdjustment(adj: AdaptiveAdjustment): Promise<void> {
  const all = await readAll<AdaptiveAdjustment>(KEYS.adjustments);
  const idx = all.findIndex((a) => a.id === adj.id);
  if (idx >= 0) all[idx] = adj;
  else all.push(adj);
  await writeAll(KEYS.adjustments, all);
}

/** Adjustments a parent still needs to approve or decline. */
export async function listPendingApprovals(childId?: string): Promise<AdaptiveAdjustment[]> {
  const all = await listAdjustments(childId);
  return all.filter(
    (a) => a.requiresParentApproval && !a.approved && (a.status ?? "pending") === "pending"
  );
}

// ---------- Parent PIN (gates Parent Mode; not a real auth system) ----------
export async function getParentPin(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.parentPin);
}

export async function setParentPin(pin: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.parentPin, pin);
}

// ---------- Active child (whose profile Child Mode shows) ----------
export async function getActiveChildId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.activeChildId);
}

export async function setActiveChildId(childId: string | null): Promise<void> {
  if (childId) await AsyncStorage.setItem(KEYS.activeChildId, childId);
  else await AsyncStorage.removeItem(KEYS.activeChildId);
}

// ---------- Dev helper ----------
export async function wipeAllData(): Promise<void> {
  await AsyncStorage.removeMany(Object.values(KEYS));
}
