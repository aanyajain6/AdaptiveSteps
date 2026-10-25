import { router, useFocusEffect } from "expo-router";
import { Check, Pencil, Plus, UserRound } from "lucide-react-native";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { AppText, Badge, Button, Card, IconTile, Screen } from "../../../components/ui";
import * as db from "../../../lib/db";
import { useApp } from "../../../state/AppProvider";
import { space } from "../../../theme/theme";
import { ChildProfile } from "../../../types/models";

const FORMAT_LABEL = { picture: "Pictures", text: "Text", voice: "Voice" } as const;

export default function ChildrenList() {
  const { activeChild, setActiveChild } = useApp();
  const [children, setChildren] = useState<ChildProfile[]>([]);

  useFocusEffect(
    useCallback(() => {
      db.listChildren().then(setChildren);
    }, [])
  );

  return (
    <Screen>
      {children.length === 0 && (
        <AppText muted>Add a profile for each learner. Child Mode shows one profile at a time.</AppText>
      )}

      {children.map((child) => {
        const isActive = child.id === activeChild?.id;
        return (
          <Card key={child.id} raised={isActive}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <IconTile icon={UserRound} tone={isActive ? "brand" : "neutral"} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="heading">{child.name}</AppText>
                <AppText variant="caption" muted>
                  Ages {child.ageBand} · Learns best with {FORMAT_LABEL[child.preferredFormat].toLowerCase()}
                </AppText>
              </View>
              {isActive && <Badge label="In Child Mode" />}
            </View>
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Button
                label="Edit"
                icon={Pencil}
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => router.push({ pathname: "/parent/children/[id]", params: { id: child.id } })}
              />
              {!isActive && (
                <Button
                  label="Use in Child Mode"
                  icon={Check}
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => setActiveChild(child.id)}
                />
              )}
            </View>
          </Card>
        );
      })}

      <Button
        label="Add a child"
        icon={Plus}
        onPress={() => router.push({ pathname: "/parent/children/[id]", params: { id: "new" } })}
      />
    </Screen>
  );
}
