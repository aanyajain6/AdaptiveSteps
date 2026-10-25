import { router, useFocusEffect } from "expo-router";
import { ClipboardList, Plus } from "lucide-react-native";
import { useCallback, useState } from "react";
import { AppText, Button, ListGroup, ListRow, Screen, Section } from "../../../components/ui";
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
      <AppText muted>
        Break homework into small, concrete steps. {activeChild.name} sees one at a time.
      </AppText>

      {sessions.length > 0 && (
        <Section title={`${activeChild.name}'s sessions`}>
          <ListGroup>
            {sessions.map((s) => (
              <ListRow
                key={s.id}
                icon={ClipboardList}
                title={s.title}
                subtitle={`${s.subject ? `${s.subject} · ` : ""}${s.steps.length} ${s.steps.length === 1 ? "step" : "steps"}`}
                accessibilityHint="Edit this session"
                onPress={() => router.push({ pathname: "/parent/sessions/[id]", params: { id: s.id } })}
              />
            ))}
          </ListGroup>
        </Section>
      )}

      <Button
        label="New session"
        icon={Plus}
        onPress={() => router.push({ pathname: "/parent/sessions/[id]", params: { id: "new" } })}
      />
    </Screen>
  );
}
