import { router, Stack, useFocusEffect } from "expo-router";
import { Plus, UserRound, Users } from "lucide-react-native";
import { useCallback, useState } from "react";
import { PageHeader, StatusList, StatusRow } from "../../../components/structure";
import { EmptyState } from "../../../components/EmptyState";
import { Button, Screen } from "../../../components/ui";
import * as db from "../../../lib/db";
import { useApp } from "../../../state/AppProvider";
import { ChildProfile } from "../../../types/models";

const FORMAT_LABEL = { picture: "Pictures", text: "Text", voice: "Voice" } as const;

export default function ChildrenList() {
  const { activeChild } = useApp();
  const [children, setChildren] = useState<ChildProfile[]>([]);

  useFocusEffect(
    useCallback(() => {
      db.listChildren().then(setChildren);
    }, [])
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: "" }} />
      <PageHeader
        icon={Users}
        title="Child profiles"
        meta="Child Mode shows one profile at a time. Open a profile to edit it or switch to it."
      />

      <Button
        label="Add a child"
        icon={Plus}
        size="lg"
        onPress={() => router.push({ pathname: "/parent/children/[id]", params: { id: "new" } })}
      />

      {children.length === 0 ? (
        <EmptyState size={120} title="No profiles yet" body="Add a profile for each learner. Hop will help them through their first session." />
      ) : (
        <StatusList>
          {children.map((child) => (
            <StatusRow
              key={child.id}
              icon={UserRound}
              title={child.name}
              meta={`Ages ${child.ageBand} · ${FORMAT_LABEL[child.preferredFormat]}`}
              status={child.id === activeChild?.id ? "active" : undefined}
              accessibilityHint="Edit this profile"
              onPress={() => router.push({ pathname: "/parent/children/[id]", params: { id: child.id } })}
            />
          ))}
        </StatusList>
      )}
    </Screen>
  );
}
