// Page-level "nothing here (yet)" moment. This is where Hop visits:
// a friendly face instead of a header followed by nothing.

import React from "react";
import { View } from "react-native";
import { space } from "../theme/theme";
import { Hop } from "./Hop";
import { AppText } from "./ui";

export function EmptyState({
  title,
  body,
  action,
  size = 150,
  celebrate = false,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  size?: number;
  /** A finished-everything moment: Hop does a small hop (skipped with reduced motion). */
  celebrate?: boolean;
}) {
  return (
    <View style={{ alignItems: "center", gap: space.lg, paddingVertical: space.xl }}>
      <Hop size={size} bounce={celebrate} />
      <View style={{ alignItems: "center", gap: space.sm, maxWidth: 360 }}>
        <AppText variant="display" style={{ textAlign: "center" }}>
          {title}
        </AppText>
        <AppText muted style={{ textAlign: "center" }}>
          {body}
        </AppText>
      </View>
      {action ? <View style={{ alignSelf: "stretch" }}>{action}</View> : null}
    </View>
  );
}
