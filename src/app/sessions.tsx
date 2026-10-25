import { router, useFocusEffect } from "expo-router";
import { ClipboardList } from "lucide-react-native";
import { useCallback, useState } from "react";
import { AppText, ListGroup, ListRow, Screen } from "../components/ui";
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
        <AppText muted>No study sessions yet. Ask a grown-up to add one.</AppText>
      )}
      {sessions && sessions.length > 0 && (
        <ListGroup>
          {sessions.map((s) => (
            <ListRow
              key={s.id}
              icon={ClipboardList}
              title={s.title}
              subtitle={`${s.subject ? `${s.subject} · ` : ""}${s.steps.length} ${s.steps.length === 1 ? "step" : "steps"}`}
              onPress={() => router.push({ pathname: "/session/[id]", params: { id: s.id } })}
            />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}
