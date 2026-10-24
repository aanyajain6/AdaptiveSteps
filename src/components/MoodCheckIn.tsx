// Five-face check-in before and after a session. Every choice is
// valid -- there's no "right" mood -- and it's always skippable.

import { Pressable, Text, View } from "react-native";
import { Mood } from "../types/models";
import { useAppTheme } from "../state/AppProvider";
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
  onPick,
}: {
  prompt: string;
  onPick: (mood: Mood | undefined) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: 20 }}>
      <AppText variant="title" style={{ textAlign: "center" }}>
        {prompt}
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
        {MOODS.map((m) => (
          <Pressable
            key={m.value}
            accessibilityRole="button"
            accessibilityLabel={m.label}
            onPress={() => onPick(m.value)}
            style={({ pressed }) => ({
              width: 96,
              paddingVertical: 12,
              alignItems: "center",
              gap: 4,
              borderRadius: theme.radius,
              borderWidth: theme.borderWidth,
              borderColor: theme.colors.border,
              backgroundColor: pressed ? theme.colors.primarySoft : theme.colors.surface,
            })}
          >
            <Text style={{ fontSize: 44 }}>{m.emoji}</Text>
            <AppText variant="caption">{m.label}</AppText>
          </Pressable>
        ))}
      </View>
      <Button label="Skip" variant="quiet" onPress={() => onPick(undefined)} />
    </View>
  );
}
