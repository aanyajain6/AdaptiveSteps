import { Stack } from "expo-router";
import { useAppTheme } from "../../state/AppProvider";
import { stackOptions } from "../../theme/navigation";

export default function ParentLayout() {
  const theme = useAppTheme();
  return (
    <Stack screenOptions={stackOptions(theme)}>
      <Stack.Screen name="index" options={{ title: "" }} />
      <Stack.Screen name="children/index" options={{ title: "Child profiles" }} />
      <Stack.Screen name="sessions/index" options={{ title: "Study sessions" }} />
      <Stack.Screen name="cards/index" options={{ title: "Review cards" }} />
      <Stack.Screen name="dashboard" options={{ title: "" }} />
      <Stack.Screen name="accessibility" options={{ title: "Accessibility" }} />
    </Stack>
  );
}
