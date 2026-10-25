// A small, quick "nice work" after each finished step. Gentle on
// purpose: no confetti or flashing, which can overwhelm. With reduced
// motion it's the same message, shown still.

import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import { useAppTheme } from "../state/AppProvider";
import { space } from "../theme/theme";
import { AppText, Icon } from "./ui";

export const CELEBRATION_MS = 1100;

export function Celebration({ message = "Nice work!" }: { message?: string }) {
  const theme = useAppTheme();
  const [scale] = useState(() => new Animated.Value(theme.reduceMotion ? 1 : 0.6));

  useEffect(() => {
    if (theme.reduceMotion) return;
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [scale, theme.reduceMotion]);

  return (
    <View accessibilityLiveRegion="polite" style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg, paddingVertical: space.xxl }}>
      <Animated.View
        testID="celebration-badge"
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.primary,
          transform: [{ scale }],
        }}
      >
        <Icon icon={Check} size={44} color={theme.colors.onPrimary} />
      </Animated.View>
      <AppText variant="display">{message}</AppText>
    </View>
  );
}
