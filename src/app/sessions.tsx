import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { AppText, Button, Screen } from "../components/ui";
import * as db from "../lib/db";
import { useApp } from "../state/AppProvider";
import { StudySession } from "../types/models";

export default function ChooseSession() {
  const { activeChild } = useApp();
  const [sessions, setSessions] = useState<StudySession[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (activeChild) db.listSessions(activeChild.id).then(setSessions);
    }, [activeChild])
  );

  return (
    <Screen>
      {sessions?.length === 0 && (
        <AppText muted>No sessions yet. Ask a grown-up to make one for you.</AppText>
      )}
      {sessions?.map((s) => (
        <Button
          key={s.id}
          big
          variant="secondary"
          label={s.title}
          onPress={() => router.push({ pathname: "/session/[id]", params: { id: s.id } })}
        />
      ))}
    </Screen>
  );
}
