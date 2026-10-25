// Brand mark + header. The mark is three ascending bars -- steps --
// drawn with Views so it inherits the theme (including high contrast).

import React from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "../state/AppProvider";
import { space, MAX_CONTENT_WIDTH } from "../theme/theme";

export function BrandMark({ size = 28 }: { size?: number }) {
  const theme = useAppTheme();
  const bar = size * 0.16;
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: theme.colors.primary,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: bar * 0.55,
        paddingBottom: size * 0.24,
      }}
    >
      {[0.28, 0.44, 0.6].map((h) => (
        <View key={h} style={{ width: bar, height: size * h, borderRadius: bar / 2, backgroundColor: theme.colors.onPrimary }} />
      ))}
    </View>
  );
}

export function Wordmark() {
  const theme = useAppTheme();
  const style = [theme.type("heading"), { color: theme.colors.text, letterSpacing: -0.4 }];
  // Not a heading: the screen's own title is the heading. One label for the whole lockup.
  return (
    <View accessible accessibilityLabel="AdaptiveSteps" style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
      <BrandMark />
      <Text style={style}>
        Adaptive<Text style={{ color: theme.colors.primary }}>Steps</Text>
      </Text>
    </View>
  );
}

/** Top bar for screens without a native header: wordmark left, optional action right. */
export function AppHeader({ right }: { right?: React.ReactNode }) {
  return (
    <View
      style={{
        width: "100%",
        maxWidth: MAX_CONTENT_WIDTH,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: space.lg + 4,
        paddingTop: space.sm,
        paddingBottom: space.xs,
        minHeight: 56,
      }}
    >
      <Wordmark />
      {right}
    </View>
  );
}
