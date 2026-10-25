import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useWindowDimensions, View } from "react-native";
import { NavRail } from "../components/NavRail";
import { AppProvider, useApp } from "../state/AppProvider";
import { stackOptions } from "../theme/navigation";
import { TABLET_BREAKPOINT } from "../theme/theme";

SplashScreen.preventAutoHideAsync();

// Fonts ship inside the app (assets/fonts, OFL-licensed) rather than from
// node_modules: web exports put node_modules assets under a
// "node_modules" URL path, which some static hosts refuse to serve --
// that was the source of the serif headers on the deployed build.
const FONT_FILES = {
  Fredoka_600SemiBold: require("../../assets/fonts/Fredoka_600SemiBold.ttf"),
  Nunito_400Regular: require("../../assets/fonts/Nunito_400Regular.ttf"),
  Nunito_600SemiBold: require("../../assets/fonts/Nunito_600SemiBold.ttf"),
  Nunito_700Bold: require("../../assets/fonts/Nunito_700Bold.ttf"),
  Nunito_800ExtraBold: require("../../assets/fonts/Nunito_800ExtraBold.ttf"),
};

function RootStack() {
  const { ready, parentUnlocked, theme } = useApp();
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const fontsDone = fontsLoaded || !!fontError;
  const { width } = useWindowDimensions();
  const showRail = width >= TABLET_BREAKPOINT;

  useEffect(() => {
    if (ready && fontsDone) SplashScreen.hideAsync();
  }, [ready, fontsDone]);

  if (!ready || !fontsDone) return null;

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: theme.colors.page }}>
      <StatusBar style={theme.highContrast ? "light" : "dark"} />
      {showRail && <NavRail />}
      <View style={{ flex: 1 }}>
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
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootStack />
    </AppProvider>
  );
}
