// A small, quick "nice work" after each finished step. Gentle on
// purpose: no confetti or flashing, which can overwhelm. With reduced
// motion it's the same message, shown still.

import { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import { useAppTheme } from "../state/AppProvider";
import { AppText } from "./ui";

export const CELEBRATION_MS = 1100;

export function Celebration() {
  const theme = useAppTheme();
  const [scale] = useState(() => new Animated.Value(theme.reduceMotion ? 1 : 0.6));

  useEffect(() => {
    if (theme.reduceMotion) return;
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [scale, theme.reduceMotion]);

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}
    >
      <Animated.Text style={{ fontSize: 88, transform: [{ scale }] }}>⭐</Animated.Text>
      <AppText variant="title">Nice work!</AppText>
    </View>
  );
}
