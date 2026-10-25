// ============================================================
// Shared UI primitives
// ============================================================
// Every screen builds from these so the design system and the UDL
// settings (text size, contrast) reach everything without per-screen
// effort. Touch targets are at least 48pt; child-facing primary
// actions use the 56pt "lg" size.

import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
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

/** Rounded square holding an icon -- the anchor for list rows and action cards. */
export function IconTile({ icon, tone = "brand", size = 40 }: { icon: LucideIcon; tone?: "brand" | "neutral"; size?: number }) {
  const theme = useAppTheme();
  const c = theme.colors;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.sm + 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tone === "brand" ? c.primarySoft : c.surfaceSunken,
      }}
    >
      <Icon icon={icon} size={size * 0.5} color={tone === "brand" ? c.primary : c.text} />
    </View>
  );
}

// ---------- Layout ----------

export function Screen({
  children,
  scroll = true,
  header,
  tone = "app",
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  /** "page" = plain white surface for structured list/stepper layouts. */
  tone?: "app" | "page";
  /** Rendered above the content, outside the padded column (e.g. AppHeader). */
  header?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const inner = <View style={[styles.column, style]}>{children}</View>;
  return (
    <SafeAreaView
      edges={header ? ["top", "bottom", "left", "right"] : ["bottom", "left", "right"]}
      style={{ flex: 1, backgroundColor: tone === "page" ? theme.colors.page : theme.colors.background }}
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

// "ink" and "outline" are the restrained pair for structured layouts: no accent color on actions.
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "ink" | "outline";

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
  const fg =
    variant === "primary"
      ? c.onPrimary
      : variant === "ink"
        ? c.onInk
        : variant === "danger"
          ? c.danger
          : variant === "ghost"
            ? c.primary
            : c.text;
  const bg =
    variant === "primary" ? c.primary : variant === "ink" ? c.ink : variant === "secondary" ? c.surface : variant === "outline" ? c.page : "transparent";
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
          transform: pressed && !theme.reduceMotion ? [{ scale: 0.985 }] : undefined,
        },
        variant === "secondary" && theme.elevation.card,
        variant === "outline" && { borderWidth: theme.borderWidth, borderColor: c.borderStrong },
        variant === "primary" && !theme.highContrast && { boxShadow: "0px 1px 2px rgba(15, 110, 100, 0.25)" },
        style,
      ]}
    >
      {icon ? <Icon icon={icon} size={size === "lg" ? 20 : 18} color={fg} /> : null}
      <Text style={[theme.type("label"), size === "lg" && { fontSize: theme.font(16) }, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

// ---------- Surfaces ----------

export function Card({
  children,
  style,
  raised,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  raised?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderRadius: radius.lg },
        raised ? theme.elevation.raised : theme.elevation.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A tappable row: icon tile, title, optional subtitle and trailing text, chevron. */
export function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  onPress,
  accessibilityHint,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  trailing?: string;
  onPress: () => void;
  accessibilityHint?: string;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, trailing].filter(Boolean).join(", ")}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.colors.surfaceSunken : "transparent" }]}
    >
      {icon ? <IconTile icon={icon} size={36} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="label">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ? (
        <AppText variant="caption" muted>
          {trailing}
        </AppText>
      ) : null}
      <Icon icon={ChevronRight} size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
}

/** Groups ListRows in one card with hairline dividers (settings-list style). */
export function ListGroup({ children }: { children: React.ReactNode }) {
  const theme = useAppTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <Card style={{ padding: 0, gap: 0, overflow: "hidden" }}>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 ? (
            // Divider is inset past the icon tile; the row itself stays full width.
            <View
              style={{
                height: theme.highContrast ? 1 : StyleSheet.hairlineWidth,
                marginLeft: 64,
                backgroundColor: theme.colors.border,
              }}
            />
          ) : null}
          {child}
        </View>
      ))}
    </Card>
  );
}

export function Badge({ label, tone = "brand" }: { label: string; tone?: "brand" | "neutral" }) {
  const theme = useAppTheme();
  const c = theme.colors;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: space.sm,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: tone === "brand" ? c.primarySoft : c.surfaceSunken,
        borderWidth: theme.highContrast ? 1 : 0,
        borderColor: c.border,
      }}
    >
      <Text style={[theme.type("caption"), { color: tone === "brand" ? c.primary : c.textMuted }]}>{label}</Text>
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
            borderWidth: theme.borderWidth,
            borderRadius: radius.md,
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
        trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
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
      <View
        accessibilityRole="radiogroup"
        style={[styles.segmented, { backgroundColor: c.surfaceSunken, borderRadius: radius.md }]}
      >
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${o.label}`}
              onPress={() => onChange(o.value)}
              style={[
                styles.segment,
                { borderRadius: radius.sm + 2 },
                selected && { backgroundColor: theme.highContrast ? c.primary : c.surface },
                selected && !theme.highContrast && theme.elevation.card,
              ]}
            >
              {o.icon ? (
                <Icon icon={o.icon} size={16} color={selected ? (theme.highContrast ? c.onPrimary : c.primary) : c.textMuted} />
              ) : null}
              <Text
                style={[
                  theme.type(selected ? "label" : "caption"),
                  { fontSize: theme.font(14), color: selected ? (theme.highContrast ? c.onPrimary : c.text) : c.textMuted },
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
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 60, paddingHorizontal: space.lg, paddingVertical: space.md },
  toggle: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 56 },
  segmented: { flexDirection: "row", flexWrap: "wrap", padding: 3, gap: 3 },
  segment: { flexGrow: 1, minHeight: MIN_TOUCH, paddingHorizontal: space.md, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
});
