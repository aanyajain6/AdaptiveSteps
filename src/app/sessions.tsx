import { router, Stack, useFocusEffect } from "expo-router";
import { ClipboardList } from "lucide-react-native";
import { useCallback, useState } from "react";
import { PageHeader, StatusList, StatusRow } from "../components/structure";
import { EmptyState } from "../components/EmptyState";
import type { StatusKind } from "../components/structure";
import { Screen } from "../components/ui";
import * as db from "../lib/db";
import { nowIso } from "../lib/time";
import { useApp } from "../state/AppProvider";
import { SessionAttempt, StudySession } from "../types/models";

export default function ChooseSession() {
  const { activeChild } = useApp();
  const [sessions, setSessions] = useState<StudySession[] | null>(null);
  const [attempts, setAttempts] = useState<SessionAttempt[]>([]);
  const [startOfToday, setStartOfToday] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!activeChild) return;
      const d = new Date(nowIso());
      setStartOfToday(new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString());
      Promise.all([db.listSessions(activeChild.id), db.listSessionAttempts(activeChild.id)]).then(([s, a]) => {
        setSessions(s);
        setAttempts(a);
      });
    }, [activeChild])
  );

  /** Today's status, same rule as the home list. */
  function statusToday(id: string): StatusKind {
    const today = attempts.filter((a) => a.sessionId === id && a.startedAt >= startOfToday);
    if (today.some((a) => a.completedAt)) return "done";
    return today.some((a) => a.stepLogs.length > 0) ? "in_progress" : "not_started";
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "" }} />
      <PageHeader icon={ClipboardList} title="Study sessions" />
      {sessions?.length === 0 && (
        <EmptyState title="No study sessions yet" body="Ask a grown-up to make one. Hop will be ready to climb the steps with you." />
      )}
      {sessions && sessions.length > 0 && (
        <StatusList>
          {sessions.map((s) => (
            <StatusRow
              key={s.id}
              icon={ClipboardList}
              title={s.title}
              meta={`${s.subject ? `${s.subject} · ` : ""}${s.steps.length} ${s.steps.length === 1 ? "step" : "steps"}`}
              status={statusToday(s.id)}
              onPress={() => router.push({ pathname: "/session/[id]", params: { id: s.id } })}
            />
          ))}
        </StatusList>
      )}
    </Screen>
  );
}
