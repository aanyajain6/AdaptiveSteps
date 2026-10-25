// UDL presentation controls, shared by the profile editor and the
// accessibility settings screen so the two can never drift apart.
// The preview renders with the *pending* values, not the current
// theme, so a parent sees the change before saving it.

import Slider from "@react-native-community/slider";
import { AArrowDown, AArrowUp } from "lucide-react-native";
import { View } from "react-native";
import { buildTheme, MAX_TEXT_SCALE, MIN_TEXT_SCALE, radius, space } from "../theme/theme";
import { useAppTheme } from "../state/AppProvider";
import { AppText, Button, ToggleRow } from "./ui";

export interface PresentationValues {
  textScale: number;
  highContrast: boolean;
  reduceAnimations: boolean;
}

export function PresentationFields({
  value,
  onChange,
}: {
  value: PresentationValues;
  onChange: (next: PresentationValues) => void;
}) {
  const theme = useAppTheme();
  const preview = buildTheme({
    highContrast: value.highContrast,
    reduceMotion: value.reduceAnimations,
    textScale: value.textScale,
  });
  const percent = Math.round(value.textScale * 100);
  const STEP = 0.25;
  const setScale = (s: number) =>
    onChange({ ...value, textScale: Math.max(MIN_TEXT_SCALE, Math.min(MAX_TEXT_SCALE, s)) });

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <AppText variant="label">Text size</AppText>
          <AppText variant="label" style={{ color: theme.colors.primary }}>
            {percent}%
          </AppText>
        </View>
        <Slider
          accessibilityLabel="Text size"
          accessibilityValue={{ text: `${percent} percent` }}
          minimumValue={MIN_TEXT_SCALE}
          maximumValue={MAX_TEXT_SCALE}
          step={STEP}
          value={value.textScale}
          onValueChange={setScale}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
          style={{ height: 48 }}
        />
        {/* Buttons too: sliders are hard to operate by keyboard or with limited fine-motor control. */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button
            label="Smaller text"
            icon={AArrowDown}
            variant="outline"
            disabled={value.textScale <= MIN_TEXT_SCALE}
            onPress={() => setScale(value.textScale - STEP)}
            style={{ flex: 1 }}
          />
          <Button
            label="Larger text"
            icon={AArrowUp}
            variant="outline"
            disabled={value.textScale >= MAX_TEXT_SCALE}
            onPress={() => setScale(value.textScale + STEP)}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      <View
        accessibilityLabel="Preview"
        style={{
          padding: space.lg,
          gap: space.xs,
          borderRadius: radius.md,
          borderWidth: preview.borderWidth,
          borderColor: preview.colors.border,
          backgroundColor: preview.colors.background,
        }}
      >
        <AppText variant="overline" style={{ color: preview.colors.textMuted, fontSize: preview.font(12) }}>
          Preview · Step 1 of 4
        </AppText>
        <AppText style={[preview.type("title"), { color: preview.colors.text }]}>Get out your math worksheet</AppText>
      </View>

      <ToggleRow
        label="High contrast"
        description="Black background, white text, bright buttons."
        value={value.highContrast}
        onChange={(highContrast) => onChange({ ...value, highContrast })}
      />
      <ToggleRow
        label="Reduce animations"
        description="Turns off celebrations and screen transitions. The device's own reduce-motion setting is always respected too."
        value={value.reduceAnimations}
        onChange={(reduceAnimations) => onChange({ ...value, reduceAnimations })}
      />
    </View>
  );
}
