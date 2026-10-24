// Child home. Deliberately sparse: two big choices, nothing else
// competing for attention. The grown-up entry point is small and
// low on the screen so it isn't the most tempting thing to tap.

import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";
import { AppText, Button, Screen } from "../components/ui";
import { useApp } from "../state/AppProvider";

export default function ChildHome() {
  const { activeChild, lockParent } = useApp();

  // Coming back here always ends Parent Mode.
  useFocusEffect(
    useCallback(() => {
      lockParent();
    }, [lockParent])
  );

  return (
    <Screen style={{ justifyContent: "space-between", paddingTop: 72 }}>
      <View style={{ gap: 24 }}>
        {activeChild ? (
          <>
            <AppText variant="title">Hi, {activeChild.name}!</AppText>
            <AppText muted>What would you like to do?</AppText>
          </>
        ) : (
          <>
            <AppText variant="title">Welcome to AdaptiveSteps</AppText>
            <AppText muted>
              A grown-up needs to set up a profile first. Tap “Grown-ups” below to begin.
            </AppText>
          </>
        )}
      </View>

      <View style={{ gap: 20 }}>
        {activeChild && (
          <AppText muted variant="caption" style={{ textAlign: "center" }}>
            More coming soon
          </AppText>
        )}
      </View>

      <Button
        label="Grown-ups"
        variant="quiet"
        icon="🔒"
        onPress={() => router.push("/pin")}
        accessibilityHint="Opens Parent Mode. A PIN is required."
      />
    </Screen>
  );
}
