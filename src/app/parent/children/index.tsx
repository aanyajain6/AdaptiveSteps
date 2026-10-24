import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { AppText, Button, Card, Screen } from "../../../components/ui";
import * as db from "../../../lib/db";
import { useApp } from "../../../state/AppProvider";
import { ChildProfile } from "../../../types/models";

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
        <AppText muted>No profiles yet. Add one to start using Child Mode.</AppText>
      )}

      {children.map((child) => {
        const isActive = child.id === activeChild?.id;
        return (
          <Card key={child.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <AppText variant="heading">{child.name}</AppText>
              {isActive && (
                <AppText variant="caption" muted>
                  In Child Mode
                </AppText>
              )}
            </View>
            <AppText variant="caption" muted>
              Ages {child.ageBand} · prefers {child.preferredFormat}
            </AppText>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                label="Edit"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => router.push({ pathname: "/parent/children/[id]", params: { id: child.id } })}
              />
              {!isActive && (
                <Button
                  label="Use in Child Mode"
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
        icon="＋"
        onPress={() => router.push({ pathname: "/parent/children/[id]", params: { id: "new" } })}
      />
    </Screen>
  );
}
