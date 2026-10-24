import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "../state/AppProvider";

function RootStack() {
  const { ready, parentUnlocked, theme } = useApp();
  if (!ready) return null;

  return (
    <>
      <StatusBar style={theme.highContrast ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: { color: theme.colors.text, fontSize: theme.font(18) },
          contentStyle: { backgroundColor: theme.colors.background },
          animation: theme.reduceMotion ? "none" : "default",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="pin" options={{ title: "Parent Mode", presentation: "modal" }} />
        <Stack.Screen name="sessions" options={{ title: "Choose a session" }} />
        <Stack.Screen name="session/[id]" options={{ title: "" }} />
        <Stack.Screen name="review" options={{ title: "Practice cards" }} />
        <Stack.Protected guard={parentUnlocked} redirectTo="/pin">
          <Stack.Screen name="parent" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootStack />
    </AppProvider>
  );
}
