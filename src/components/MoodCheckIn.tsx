// Five-face check-in before and after a session. Every choice is
// valid -- there's no "right" mood -- and it's always skippable.
// The only place in the app that uses emoji: here the faces ARE the
// content, and they're easier to read than words for many kids.

import { Pressable, Text, View } from "react-native";
import { Mood } from "../types/models";
import { useAppTheme } from "../state/AppProvider";
import { radius, space } from "../theme/theme";
import { AppText, Button } from "./ui";

export const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: "happy", emoji: "😀", label: "Happy" },
  { value: "okay", emoji: "🙂", label: "Okay" },
  { value: "worried", emoji: "😟", label: "Worried" },
  { value: "upset", emoji: "😢", label: "Upset" },
  { value: "tired", emoji: "😴", label: "Tired" },
];

export function MoodCheckIn({
  prompt,
  subtitle,
  onPick,
}: {
  prompt: string;
  subtitle?: string;
  onPick: (mood: Mood | undefined) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: space.sm, alignItems: "center" }}>
        <AppText variant="display" style={{ textAlign: "center" }}>
          {prompt}
        </AppText>
        {subtitle ? (
          <AppText muted style={{ textAlign: "center" }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.md }}>
        {MOODS.map((m) => (
          <Pressable
            key={m.value}
            accessibilityRole="button"
            accessibilityLabel={m.label}
            onPress={() => onPick(m.value)}
            style={({ pressed }) => [
              {
                width: 96,
                paddingVertical: space.lg,
                alignItems: "center",
                gap: space.sm,
                borderRadius: radius.lg,
                backgroundColor: pressed ? theme.colors.accentSoft : theme.colors.surface,
                transform: pressed && !theme.reduceMotion ? [{ scale: 0.96 }] : undefined,
              },
              theme.elevation.card,
            ]}
          >
            <Text style={{ fontSize: 40 }}>{m.emoji}</Text>
            <AppText variant="caption">{m.label}</AppText>
          </Pressable>
        ))}
      </View>
      <Button label="Skip" variant="ghost" onPress={() => onPick(undefined)} style={{ alignSelf: "center" }} />
    </View>
  );
}
