import { router } from "expo-router";
import { View } from "react-native";
import { AppText, Button, Card, Screen } from "../../components/ui";
import { useApp } from "../../state/AppProvider";

export default function ParentHome() {
  const { activeChild, lockParent } = useApp();

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
        <Button label="Child profiles" variant="secondary" icon="👤" onPress={() => router.push("/parent/children")} />
      </View>

      <Button label="Back to Child Mode" variant="secondary" onPress={exitParentMode} />
    </Screen>
  );
}
