import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppProvider, useApp } from "../state/AppProvider";
import { stackOptions } from "../theme/navigation";

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { ready, parentUnlocked, theme } = useApp();
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const fontsDone = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready && fontsDone) SplashScreen.hideAsync();
  }, [ready, fontsDone]);

  if (!ready || !fontsDone) return null;

  return (
    <>
      <StatusBar style={theme.highContrast ? "light" : "dark"} />
      <Stack screenOptions={stackOptions(theme)}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="pin" options={{ title: "Parent Mode", presentation: "modal" }} />
        <Stack.Screen name="sessions" options={{ title: "Study sessions" }} />
        <Stack.Screen name="session/[id]" options={{ title: "" }} />
        <Stack.Screen name="review" options={{ title: "Practice" }} />
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
