import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { AppText, Button, Card, Screen } from "../../../components/ui";
import * as db from "../../../lib/db";
import { useApp } from "../../../state/AppProvider";
import { StudySession } from "../../../types/models";

export default function SessionsList() {
  const { activeChild } = useApp();
  const [sessions, setSessions] = useState<StudySession[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (activeChild) db.listSessions(activeChild.id).then(setSessions);
    }, [activeChild])
  );

  if (!activeChild) {
    return (
      <Screen>
        <AppText muted>Create a child profile first, then build sessions for them here.</AppText>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText muted>Study sessions for {activeChild.name}</AppText>

      {sessions.map((s) => (
        <Card key={s.id}>
          <AppText variant="heading">{s.title}</AppText>
          <AppText variant="caption" muted>
            {s.subject ? `${s.subject} · ` : ""}
            {s.steps.length} {s.steps.length === 1 ? "step" : "steps"}
          </AppText>
          <Button
            label="Edit"
            variant="secondary"
            onPress={() => router.push({ pathname: "/parent/sessions/[id]", params: { id: s.id } })}
          />
        </Card>
      ))}

      <Button
        label="New session"
        icon="＋"
        onPress={() => router.push({ pathname: "/parent/sessions/[id]", params: { id: "new" } })}
      />
    </Screen>
  );
}
