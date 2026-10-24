import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { AppText, Button, Card, Screen } from "../../components/ui";
import * as db from "../../lib/db";
import { useApp } from "../../state/AppProvider";

export default function ParentHome() {
  const { activeChild, lockParent } = useApp();
  const [pendingCount, setPendingCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (activeChild) db.listPendingApprovals(activeChild.id).then((p) => setPendingCount(p.length));
    }, [activeChild])
  );

  function exitParentMode() {
    lockParent();
    router.dismissTo("/");
  }

  return (
    <Screen>
      <Card>
        <AppText variant="caption" muted>
          Child Mode is set up for
        </AppText>
        <AppText variant="heading">{activeChild?.name ?? "No profile yet"}</AppText>
      </Card>

      <View style={{ gap: 12 }}>
        <Button
          label={pendingCount ? `Progress (${pendingCount} to review)` : "Progress"}
          icon="📈"
          onPress={() => router.push("/parent/dashboard")}
        />
        <Button label="Child profiles" variant="secondary" icon="👤" onPress={() => router.push("/parent/children")} />
        <Button label="Study sessions" variant="secondary" icon="📋" onPress={() => router.push("/parent/sessions")} />
        <Button label="Review cards" variant="secondary" icon="🃏" onPress={() => router.push("/parent/cards")} />
        <Button label="Accessibility" variant="secondary" icon="👁" onPress={() => router.push("/parent/accessibility")} />
      </View>

      <Button label="Back to Child Mode" variant="secondary" onPress={exitParentMode} />
    </Screen>
  );
}
