// ============================================================
// Shared UI primitives
// ============================================================
// Every screen builds from these so the UDL settings (text size,
// contrast) reach everything without per-screen effort. Touch
// targets are at least 56pt -- larger than platform minimums, on
// purpose, for kids with motor-planning or fine-motor difficulty.

import React from "react";
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../state/AppProvider";

export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const inner = <View style={[styles.screenInner, style]}>{children}</View>;
  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

type TextVariant = "title" | "heading" | "body" | "caption";
const BASE_SIZE: Record<TextVariant, number> = { title: 28, heading: 20, body: 17, caption: 14 };

export function AppText({
  variant = "body",
  muted,
  style,
  children,
  ...rest
}: {
  variant?: TextVariant;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Text>, "style" | "children">) {
  const theme = useAppTheme();
  const size = theme.font(BASE_SIZE[variant]);
  return (
    <Text
      accessibilityRole={variant === "title" || variant === "heading" ? "header" : undefined}
      style={[
        {
          color: muted ? theme.colors.textMuted : theme.colors.text,
          fontSize: size,
          lineHeight: Math.round(size * 1.35),
          fontWeight: variant === "title" || variant === "heading" ? "700" : "400",
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

type ButtonVariant = "primary" | "secondary" | "quiet";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  icon,
  accessibilityHint,
  style,
  big,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: string; // emoji shown before the label
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  big?: boolean;
}) {
  const theme = useAppTheme();
  const c = theme.colors;
  const bg = variant === "primary" ? c.primary : variant === "secondary" ? c.surface : "transparent";
  const fg = variant === "primary" ? c.onPrimary : c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: big ? 72 : 56,
          backgroundColor: bg,
          borderRadius: theme.radius,
          borderWidth: variant === "quiet" ? 0 : theme.borderWidth,
          borderColor: variant === "primary" ? c.primary : c.border,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: fg,
          fontSize: theme.font(big ? 22 : 18),
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {icon ? `${icon}  ` : ""}
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: theme.borderWidth,
          borderRadius: theme.radius,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Field({ label, ...input }: { label: string } & TextInputProps) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.textMuted}
        {...input}
        style={[
          {
            minHeight: 52,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: theme.font(17),
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderWidth: theme.borderWidth,
            borderRadius: theme.radius,
          },
          input.style,
        ]}
      />
    </View>
  );
}

export function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText>{label}</AppText>
        {description ? (
          <AppText variant="caption" muted>
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
      />
    </View>
  );
}

/** Segmented single-choice control; each option is a full-size touch target. */
export function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <View accessibilityRole="radiogroup" style={styles.optionRow}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${o.label}`}
              onPress={() => onChange(o.value)}
              style={{
                flexGrow: 1,
                minHeight: 52,
                paddingHorizontal: 12,
                justifyContent: "center",
                alignItems: "center",
                borderRadius: theme.radius,
                borderWidth: selected ? 2 : theme.borderWidth,
                borderColor: selected ? theme.colors.primary : theme.colors.border,
                backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
              }}
            >
              <Text
                style={{
                  fontSize: theme.font(16),
                  fontWeight: selected ? "700" : "500",
                  color: selected ? theme.colors.primary : theme.colors.text,
                }}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenInner: { flex: 1, padding: 20, gap: 16 },
  button: { paddingHorizontal: 20, paddingVertical: 12, justifyContent: "center", alignItems: "center" },
  card: { padding: 16, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
