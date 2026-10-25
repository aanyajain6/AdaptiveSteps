// Brand lockup: Hop's face as the mark, then the two-tone Fredoka
// wordmark (plum "Adaptive", coral "Steps"). The coral is the brand
// color as-is: logotypes are exempt from text-contrast minimums, and
// the screen reader gets the name from the label either way.

import React from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "../state/AppProvider";
import { family, space, MAX_CONTENT_WIDTH } from "../theme/theme";
import { HopFace } from "./Hop";

const WORDMARK_CORAL = "#FF6B4A";

export function BrandMark({ size = 30 }: { size?: number }) {
  return <HopFace size={size} />;
}

export function Wordmark({ size = 22 }: { size?: number }) {
  const theme = useAppTheme();
  // A logo, not reading text: fixed size, so large-text settings never push the header actions off screen.
  const style = { fontFamily: family("display"), fontSize: size, lineHeight: Math.round(size * 1.15), color: theme.colors.text };
  // Not a heading: the screen's own title is the heading. One label for the whole lockup.
  return (
    <View accessible accessibilityLabel="AdaptiveSteps" style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
      <BrandMark />
      <Text style={style}>
        Adaptive<Text style={{ color: theme.highContrast ? theme.colors.primary : WORDMARK_CORAL }}>Steps</Text>
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
