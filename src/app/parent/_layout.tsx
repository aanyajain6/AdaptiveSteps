import { Stack } from "expo-router";
import { useAppTheme } from "../../state/AppProvider";

export default function ParentLayout() {
  const theme = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.primary,
        headerTitleStyle: { color: theme.colors.text, fontSize: theme.font(18) },
        contentStyle: { backgroundColor: theme.colors.background },
        animation: theme.reduceMotion ? "none" : "default",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Parent Mode" }} />
      <Stack.Screen name="children/index" options={{ title: "Child profiles" }} />
      <Stack.Screen name="sessions/index" options={{ title: "Study sessions" }} />
    </Stack>
  );
}
