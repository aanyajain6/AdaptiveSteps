// ============================================================
// App-wide state: active child, Parent Mode, theme
// ============================================================
// Parent Mode unlock lives in memory only -- it resets whenever the
// app restarts or the child home screen comes back into view, so a
// device handed back to a child is never left unlocked.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { ChildProfile } from "../types/models";
import * as db from "../lib/db";
import { buildTheme, Theme } from "../theme/theme";

interface AppState {
  ready: boolean;
  activeChild: ChildProfile | null;
  setActiveChild: (childId: string | null) => Promise<void>;
  /** Re-read the active child after its profile is edited. */
  refreshActiveChild: () => Promise<void>;
  parentUnlocked: boolean;
  unlockParent: () => void;
  lockParent: () => void;
  theme: Theme;
}

const AppContext = createContext<AppState | null>(null);

async function loadActiveChild(): Promise<ChildProfile | null> {
  const id = await db.getActiveChildId();
  let child = id ? await db.getChild(id) : undefined;
  // Fall back to the first profile so a deleted active child doesn't strand the app.
  if (!child) {
    child = (await db.listChildren())[0];
    await db.setActiveChildId(child?.id ?? null);
  }
  return child ?? null;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [activeChild, setActiveChildState] = useState<ChildProfile | null>(null);
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);

  const refreshActiveChild = useCallback(async () => {
    setActiveChildState(await loadActiveChild());
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadActiveChild().then((child) => {
      if (cancelled) return;
      setActiveChildState(child);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The OS-level reduce motion setting is always respected, on top of the profile toggle.
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSystemReduceMotion);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setSystemReduceMotion);
    return () => sub.remove();
  }, []);

  const setActiveChild = useCallback(
    async (childId: string | null) => {
      await db.setActiveChildId(childId);
      await refreshActiveChild();
    },
    [refreshActiveChild]
  );

  const theme = useMemo(
    () =>
      buildTheme({
        highContrast: activeChild?.highContrast ?? false,
        reduceMotion: (activeChild?.reduceAnimations ?? false) || systemReduceMotion,
        textScale: activeChild?.textScale ?? 1,
      }),
    [activeChild, systemReduceMotion]
  );

  const value = useMemo<AppState>(
    () => ({
      ready,
      activeChild,
      setActiveChild,
      refreshActiveChild,
      parentUnlocked,
      unlockParent: () => setParentUnlocked(true),
      lockParent: () => setParentUnlocked(false),
      theme,
    }),
    [ready, activeChild, setActiveChild, refreshActiveChild, parentUnlocked, theme]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

export function useAppTheme(): Theme {
  return useApp().theme;
}
