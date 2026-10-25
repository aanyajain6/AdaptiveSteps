// ============================================================
// Shared UI primitives
// ============================================================
// Every screen builds from these so the design system and the UDL
// settings (text size, contrast) reach everything without per-screen
// effort. Rounded (12-20pt corners) with soft shadows from the theme's
// elevation tokens; high contrast swaps shadows for solid borders.
// Touch targets are at least 48pt; child-facing primary actions use
// the 56pt "lg" size.

import type { LucideIcon } from "lucide-react-native";
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
import { MAX_CONTENT_WIDTH, MIN_TOUCH, radius, space, TextVariant } from "../theme/theme";

// ---------- Icon ----------

/** One icon set (Lucide), one stroke weight, everywhere. */
export const ICON_STROKE = 1.75;

export function Icon({
  icon: IconComponent,
  size = 20,
  color,
}: {
  icon: LucideIcon;
  size?: number;
  color?: string;
}) {
  const theme = useAppTheme();
  return (
    <IconComponent
      size={theme.font(size)}
      color={color ?? theme.colors.text}
      strokeWidth={ICON_STROKE}
      absoluteStrokeWidth
    />
  );
}

// ---------- Layout ----------

export function Screen({
  children,
  scroll = true,
  header,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  /** Rendered above the content, outside the padded column (e.g. AppHeader). */
  header?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const inner = <View style={[styles.column, style]}>{children}</View>;
  return (
    <SafeAreaView
      edges={header ? ["top", "bottom", "left", "right"] : ["bottom", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.colors.page }}
    >
      {header}
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

export function Section({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      {title ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: space.xs }}>
          <AppText variant="overline" muted>
            {title}
          </AppText>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// ---------- Text ----------

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
  const isHeader = variant === "display" || variant === "title" || variant === "heading";
  return (
    <Text
      accessibilityRole={isHeader ? "header" : undefined}
      style={[theme.type(variant), { color: muted ? theme.colors.textMuted : theme.colors.text }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

// ---------- Buttons ----------

// One coral "primary" per screen; everything else is "outline" (a white
// raised button), or text-only "ghost"/"danger".
type ButtonVariant = "primary" | "outline" | "ghost" | "danger";

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  icon,
  accessibilityHint,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: "md" | "lg";
  disabled?: boolean;
  icon?: LucideIcon;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const c = theme.colors;
  const fg = variant === "primary" ? c.onPrimary : variant === "danger" ? c.danger : variant === "ghost" ? c.link : c.text;
  const bg = variant === "primary" ? c.primary : variant === "outline" ? c.surface : "transparent";
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
          minHeight: size === "lg" ? 56 : MIN_TOUCH,
          paddingHorizontal: size === "lg" ? space.xl : space.lg + 2,
          backgroundColor: bg,
          borderRadius: radius.md,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          transform: pressed && !theme.reduceMotion ? [{ scale: 0.97 }] : undefined,
        },
        variant === "primary" && !disabled && theme.elevation.primary,
        variant === "outline" && theme.elevation.card,
        style,
      ]}
    >
      {icon ? <Icon icon={icon} size={size === "lg" ? 20 : 18} color={fg} /> : null}
      <Text style={[theme.type("label"), size === "lg" && { fontSize: theme.font(16) }, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

// ---------- Surfaces ----------

/** Rounded white panel with a soft shadow, for grouped content (charts, stats). */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: radius.lg }, theme.elevation.card, style]}>
      {children}
    </View>
  );
}

// ---------- Inputs ----------

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
          theme.type("body"),
          {
            minHeight: MIN_TOUCH,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: theme.colors.text,
            backgroundColor: theme.colors.field,
            borderColor: theme.colors.borderStrong,
            borderWidth: theme.highContrast ? 2 : 1.5,
            borderRadius: radius.sm,
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
    <View style={styles.toggle}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="label">{label}</AppText>
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
        trackColor={{ true: theme.colors.link, false: theme.colors.borderStrong }}
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
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useAppTheme();
  const c = theme.colors;
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <View accessibilityRole="radiogroup" style={styles.segmented}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${o.label}`}
              onPress={() => onChange(o.value)}
              // Unselected options are white raised chips; the selected one takes the coral border and tint.
              style={[
                styles.segment,
                { borderRadius: radius.sm, backgroundColor: selected ? (theme.highContrast ? c.primary : c.primarySoft) : c.surface },
                theme.elevation.card,
                selected && { borderColor: c.primary },
              ]}
            >
              {o.icon ? (
                <Icon icon={o.icon} size={16} color={selected && theme.highContrast ? c.onPrimary : c.text} />
              ) : null}
              <Text
                style={[
                  theme.type(selected ? "label" : "caption"),
                  { fontSize: theme.font(14), color: selected && theme.highContrast ? c.onPrimary : c.text },
                ]}
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
  column: {
    flexGrow: 1,
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
    paddingHorizontal: space.lg + 4,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
    gap: space.xl,
  },
  button: { flexDirection: "row", gap: space.sm, alignItems: "center", justifyContent: "center", paddingVertical: space.md },
  card: { padding: space.lg, gap: space.md },
  toggle: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 56 },
  segmented: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  segment: { flexGrow: 1, minHeight: MIN_TOUCH, paddingHorizontal: space.md, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
});
