import { router, Stack, useFocusEffect } from "expo-router";
import { ClipboardList, Plus } from "lucide-react-native";
import { useCallback, useState } from "react";
import { PageHeader, StatusList, StatusRow } from "../../../components/structure";
import type { StatusKind } from "../../../components/structure";
import { AppText, Button, Screen } from "../../../components/ui";
import * as db from "../../../lib/db";
import { useApp } from "../../../state/AppProvider";
import { SessionAttempt, StudySession } from "../../../types/models";

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function SessionsList() {
  const { activeChild } = useApp();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [attempts, setAttempts] = useState<SessionAttempt[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!activeChild) return;
      Promise.all([db.listSessions(activeChild.id), db.listSessionAttempts(activeChild.id)]).then(([s, a]) => {
        setSessions(s);
        setAttempts(a);
      });
    }, [activeChild])
  );

  const header = <Stack.Screen options={{ title: "" }} />;

  if (!activeChild) {
    return (
      <Screen>
        {header}
        <AppText muted>Create a child profile first, then build sessions for them here.</AppText>
      </Screen>
    );
  }

  /** Status of the most recent run: never run, stopped partway, or finished. */
  function lastRun(sessionId: string): { status: StatusKind; when?: string } {
    const latest = attempts
      .filter((a) => a.sessionId === sessionId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    if (!latest) return { status: "not_started" };
    return { status: latest.completedAt ? "done" : "in_progress", when: latest.startedAt };
  }

  return (
    <Screen>
      {header}
      <PageHeader
        icon={ClipboardList}
        title="Study sessions"
        meta={`${activeChild.name} · Break homework into small, concrete steps.`}
      />

      <Button
        label="New session"
        icon={Plus}
        size="lg"
        onPress={() => router.push({ pathname: "/parent/sessions/[id]", params: { id: "new" } })}
      />

      {sessions.length > 0 ? (
        <StatusList>
          {sessions.map((s) => {
            const run = lastRun(s.id);
            const extra = s.steps.filter((st) => st.supportTier > 0).length;
            return (
              <StatusRow
                key={s.id}
                icon={ClipboardList}
                title={s.title}
                meta={[
                  s.subject,
                  `${s.steps.length} ${s.steps.length === 1 ? "step" : "steps"}`,
                  extra ? `${extra} with extra support` : null,
                  run.when ? `Last run ${shortDate(run.when)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                status={run.status}
                accessibilityHint="Edit this session"
                onPress={() => router.push({ pathname: "/parent/sessions/[id]", params: { id: s.id } })}
              />
            );
          })}
        </StatusList>
      ) : (
        <AppText muted>No sessions yet.</AppText>
      )}
    </Screen>
  );
}
