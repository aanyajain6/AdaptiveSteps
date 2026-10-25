// ============================================================
// Structured layout primitives
// ============================================================
// List-first building blocks: a page header with a "Viewing by"
// filter, status rows, and a numbered vertical stepper. Playful but
// orderly: rounded cards with soft shadows, a sky icon chip on every
// row, and status shown as a tinted pill that always carries an icon
// and words (never color alone).

import type { LucideIcon } from "lucide-react-native";
import {
  Check,
  ChevronDown,
  Circle,
  CircleArrowUp,
  CircleCheck,
  CircleDot,
  CircleMinus,
  CirclePlus,
  CircleQuestionMark,
  CircleSlash,
} from "lucide-react-native";
import React, { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { STEP_STATUS_LABELS, StepStatus } from "../lib/presentation";
import { useAppTheme } from "../state/AppProvider";
import { MIN_TOUCH, radius, space, ThemeColors } from "../theme/theme";
import { AppText, Icon } from "./ui";

// ---------- Page header ----------

export function PageHeader({
  icon,
  title,
  meta,
  right,
}: {
  icon: LucideIcon;
  title: string;
  meta?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, flexWrap: "wrap" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, flexShrink: 1, flexGrow: 1 }}>
          <IconChip icon={icon} tone="secondary" size={40} />
          <AppText variant="title" style={{ flexShrink: 1 }}>
            {title}
          </AppText>
        </View>
        {right}
      </View>
      {meta ? (
        <AppText variant="caption" muted>
          {meta}
        </AppText>
      ) : null}
    </View>
  );
}

/** Round colored chip holding an icon. Icons are plum on every tint (white on sky is only 2.5:1). */
export function IconChip({
  icon,
  tone = "secondary",
  size = 40,
}: {
  icon: LucideIcon;
  tone?: "secondary" | "primary" | "accent" | "success";
  size?: number;
}) {
  const theme = useAppTheme();
  const c = theme.colors;
  const bg = { secondary: c.secondarySoft, primary: c.primarySoft, accent: c.accentSoft, success: c.successSoft }[tone];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
        borderWidth: theme.highContrast ? 1 : 0,
        borderColor: c.border,
      }}
    >
      <Icon icon={icon} size={size * 0.48} color={c.text} />
    </View>
  );
}

// ---------- "Viewing by" dropdown ----------

export function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const theme = useAppTheme();
  const c = theme.colors;
  const { width: windowWidth } = useWindowDimensions();
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number } | null>(null);
  const trigger = useRef<React.ComponentRef<typeof View>>(null);
  const current = options.find((o) => o.value === value)?.label ?? "";
  const open = anchor !== null;
  const close = () => setAnchor(null);

  function openMenu() {
    // Anchor the panel directly under the control, like a native select.
    trigger.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y: y + height + 6, width }));
  }

  return (
    <>
      <Pressable
        ref={trigger}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current}`}
        accessibilityHint="Opens a list of options"
        onPress={openMenu}
        style={({ pressed }) => [
          styles.dropdown,
          theme.elevation.card,
          { backgroundColor: pressed ? c.surfaceSunken : c.surface },
        ]}
      >
        <Text style={[theme.type("caption"), { color: c.textMuted }]}>{label}:</Text>
        <Text style={[theme.type("label"), { fontSize: theme.font(14), color: c.text }]}>{current}</Text>
        <Icon icon={ChevronDown} size={16} color={c.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={close}>
        {/* Transparent backdrop closes on outside tap; the panel itself carries the depth. */}
        <Pressable accessibilityLabel="Close" onPress={close} style={{ flex: 1 }}>
          <View
            accessibilityRole="menu"
            style={[
              {
                position: "absolute",
                top: anchor?.y ?? 0,
                // Right-align with the trigger, never narrower than it, never off-screen.
                right: Math.max(space.sm, windowWidth - (anchor ? anchor.x + anchor.width : windowWidth)),
                minWidth: Math.max(220, anchor?.width ?? 0),
                borderRadius: radius.md,
                backgroundColor: c.surface,
                paddingVertical: space.sm,
                overflow: "hidden",
              },
              theme.elevation.raised,
            ]}
          >
            <AppText variant="overline" muted style={{ paddingHorizontal: space.lg, paddingVertical: space.sm }}>
              {label}
            </AppText>
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                  accessibilityLabel={o.label}
                  onPress={() => {
                    onChange(o.value);
                    close();
                  }}
                  style={({ pressed }) => ({
                    minHeight: MIN_TOUCH,
                    marginHorizontal: space.sm,
                    paddingHorizontal: space.md,
                    borderRadius: radius.sm,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: selected ? c.primarySoft : pressed ? c.surfaceSunken : "transparent",
                  })}
                >
                  <AppText variant={selected ? "label" : "body"}>{o.label}</AppText>
                  {selected ? <Icon icon={Check} size={18} color={c.text} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ---------- Status pill ----------

export type StatusKind =
  | StepStatus
  | "extra_support"
  | "active"
  // Outcomes of an adaptive adjustment (parent-facing history).
  | "approved"
  | "declined"
  | "automatic"
  | "superseded";

type Tint = "neutral" | "secondary" | "accent" | "success" | "primary";

const STATUS: Record<StatusKind, { icon: LucideIcon; label: string; tint: Tint }> = {
  not_started: { icon: Circle, label: STEP_STATUS_LABELS.not_started, tint: "neutral" },
  in_progress: { icon: CircleDot, label: STEP_STATUS_LABELS.in_progress, tint: "secondary" },
  needs_help: { icon: CircleQuestionMark, label: STEP_STATUS_LABELS.needs_help, tint: "accent" },
  done: { icon: CircleCheck, label: STEP_STATUS_LABELS.done, tint: "success" },
  extra_support: { icon: CirclePlus, label: "Extra Support", tint: "accent" },
  active: { icon: CircleDot, label: "In Child Mode", tint: "primary" },
  approved: { icon: CircleCheck, label: "Approved", tint: "success" },
  declined: { icon: CircleSlash, label: "Not yet", tint: "neutral" },
  automatic: { icon: CircleArrowUp, label: "Automatic", tint: "secondary" },
  superseded: { icon: CircleMinus, label: "Replaced", tint: "neutral" },
};

function tintColor(c: ThemeColors, tint: Tint): string {
  return { neutral: c.surfaceSunken, secondary: c.secondarySoft, accent: c.accentSoft, success: c.successSoft, primary: c.primarySoft }[tint];
}

/** Tinted pill: glyph + plain-language label in plum (12:1+ on every tint). */
export function StatusIndicator({ status }: { status: StatusKind }) {
  const theme = useAppTheme();
  const { icon, label, tint } = STATUS[status];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radius.pill,
        backgroundColor: tintColor(theme.colors, tint),
        borderWidth: theme.highContrast ? 1 : 0,
        borderColor: theme.colors.border,
      }}
    >
      <Icon icon={icon} size={14} color={theme.colors.text} />
      <Text style={[theme.type("overline"), { textTransform: "none", letterSpacing: 0, color: theme.colors.text }]}>{label}</Text>
    </View>
  );
}

// ---------- Status list ----------

/**
 * Above this text scale, a row's status pill moves under its title
 * instead of beside it, so large text never truncates the title.
 */
const STACK_STATUS_ABOVE_SCALE = 1.25;

/** A stack of status-row cards. */
export function StatusList({ children }: { children: React.ReactNode }) {
  return <View style={{ gap: 10 }}>{children}</View>;
}

export function StatusRow({
  icon,
  title,
  meta,
  detail,
  status,
  trailing,
  onPress,
  accessibilityHint,
}: {
  icon: LucideIcon;
  title: string;
  /** One muted line: subject, due date, counts. */
  meta?: string;
  /** Full-length secondary text that must never be cut off (e.g. an adjustment's reason). */
  detail?: string;
  status?: StatusKind;
  /** Right-aligned plain text when there's no status (e.g. a count). */
  trailing?: string;
  onPress?: () => void;
  accessibilityHint?: string;
}) {
  const theme = useAppTheme();
  const c = theme.colors;
  const stack = theme.textScale > STACK_STATUS_ABOVE_SCALE;
  const pill = status ? <StatusIndicator status={status} /> : null;
  return (
    <Pressable
      disabled={!onPress}
      accessibilityRole={onPress ? "link" : undefined}
      accessibilityLabel={[title, meta, detail, status ? STATUS[status].label : trailing].filter(Boolean).join(", ")}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        theme.elevation.card,
        {
          backgroundColor: pressed ? c.surfaceSunken : c.surface,
          transform: pressed && !theme.reduceMotion ? [{ scale: 0.99 }] : undefined,
        },
      ]}
    >
      <IconChip icon={icon} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="label" numberOfLines={stack ? undefined : 2}>
          {title}
        </AppText>
        {meta ? (
          <AppText variant="caption" muted numberOfLines={stack ? undefined : 1}>
            {meta}
          </AppText>
        ) : null}
        {detail ? <AppText variant="caption">{detail}</AppText> : null}
        {stack && pill ? <View style={{ alignSelf: "flex-start", marginTop: space.xs }}>{pill}</View> : null}
      </View>
      {!stack ? pill : null}
      {!status && trailing ? (
        <AppText variant="label" muted>
          {trailing}
        </AppText>
      ) : null}
    </Pressable>
  );
}

// ---------- Vertical numbered stepper ----------

export interface StepperItem {
  key: string;
  /** 1-based position shown in the circle. */
  number: number;
  title: string;
  meta?: string;
  /** Omitted in authoring mode, where nothing has a run status yet. */
  status?: StepStatus;
}

const NODE = 32;
/** Card head height; the rail circle is centered on it. */
const HEAD = 60;
const ROW_GAP = 10;

/**
 * Numbered circles joined by a vertical line, one card per step:
 * done = leaf check, current = coral, upcoming = outlined + muted.
 * The line below a finished step turns leaf green (progress). The
 * current step's card is raised and holds `renderExpanded`.
 *
 * variant "authoring" (the builder): same sequence visual, but no
 * progress meaning -- no checks, no green line; only the step being
 * edited is coral.
 */
export function Stepper({
  items,
  currentKey,
  onSelect,
  renderExpanded,
  noun = "Step",
  variant = "progress",
  selectHint = "Go to this step",
}: {
  variant?: "progress" | "authoring";
  selectHint?: string;
  /** What each item is called for assistive tech ("Step 2", "Card 2"). */
  noun?: string;
  items: StepperItem[];
  currentKey: string;
  onSelect?: (key: string) => void;
  renderExpanded?: (item: StepperItem) => React.ReactNode;
}) {
  const theme = useAppTheme();
  const c = theme.colors;
  const lineTop = (HEAD - NODE) / 2;
  const stack = theme.textScale > STACK_STATUS_ABOVE_SCALE;

  return (
    <View accessibilityRole="list">
      {items.map((item, i) => {
        const isCurrent = item.key === currentKey;
        const authoring = variant === "authoring";
        const isDone = !authoring && item.status === "done";
        const first = i === 0;
        const last = i === items.length - 1;
        const lineAbove = !authoring && !first && items[i - 1].status === "done" ? c.success : c.borderStrong;
        const lineBelow = isDone ? c.success : c.borderStrong;

        const circle = isCurrent ? (
          <View style={[styles.node, { backgroundColor: c.primary, borderColor: c.primary }, !theme.highContrast && theme.elevation.primary]}>
            <Text style={[theme.type("label"), { color: c.onPrimary }]}>{item.number}</Text>
          </View>
        ) : isDone ? (
          <View style={[styles.node, { backgroundColor: c.success, borderColor: c.success }]}>
            <Icon icon={Check} size={16} color={c.onInk} />
          </View>
        ) : (
          <View style={[styles.node, { backgroundColor: c.surface, borderColor: c.borderStrong }]}>
            <Text style={[theme.type("label"), { color: c.textMuted }]}>{item.number}</Text>
          </View>
        );

        return (
          <View key={item.key} accessibilityRole="none" style={{ flexDirection: "row", paddingBottom: last ? 0 : ROW_GAP }}>
            {/* Rail: line in, circle, line out (the out-line also spans the gap to the next card). */}
            <View style={{ width: 44, alignItems: "center", marginBottom: last ? 0 : -ROW_GAP }}>
              <View style={[styles.line, { height: lineTop, backgroundColor: first ? "transparent" : lineAbove }]} />
              {circle}
              <View style={[styles.line, { flex: 1, backgroundColor: last ? "transparent" : lineBelow }]} />
            </View>

            <View
              style={[
                { flex: 1, borderRadius: radius.md, backgroundColor: c.surface, paddingHorizontal: space.md + 2 },
                isCurrent ? theme.elevation.raised : theme.elevation.card,
                isCurrent && { borderColor: c.primary },
              ]}
            >
              <Pressable
                disabled={!onSelect || isCurrent}
                accessibilityRole="button"
                accessibilityState={{ selected: isCurrent }}
                // "current" is in the label because web drops the selected state on buttons.
                accessibilityLabel={`${noun} ${item.number}${isCurrent ? (authoring ? ", editing" : ", current") : ""}: ${item.title}.${item.status ? ` ${STATUS[item.status].label}.` : ""}`}
                accessibilityHint={isCurrent ? undefined : selectHint}
                onPress={() => onSelect?.(item.key)}
                style={({ pressed }) => [styles.stepHead, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText
                    variant={isCurrent ? "heading" : "label"}
                    style={{ color: !authoring && item.status === "not_started" && !isCurrent ? c.textMuted : c.text }}
                    numberOfLines={isCurrent || stack ? undefined : 2}
                  >
                    {item.title}
                  </AppText>
                  {item.meta ? (
                    <AppText variant="caption" muted numberOfLines={stack ? undefined : 1}>
                      {item.meta}
                    </AppText>
                  ) : null}
                  {stack && item.status ? (
                    <View style={{ alignSelf: "flex-start", marginTop: space.xs }}>
                      <StatusIndicator status={item.status} />
                    </View>
                  ) : null}
                </View>
                {!stack && item.status ? <StatusIndicator status={item.status} /> : null}
              </Pressable>
              {isCurrent && renderExpanded ? <View style={{ paddingBottom: space.lg }}>{renderExpanded(item)}</View> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ---------- Form section ----------

/** A titled card grouping related form fields. */
export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={[{ gap: space.lg, padding: space.lg, borderRadius: radius.lg, backgroundColor: theme.colors.surface }, theme.elevation.card]}>
      <AppText variant="overline" muted>
        {title}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 68,
    paddingVertical: space.md,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.md,
  },
  node: { width: NODE, height: NODE, borderRadius: NODE / 2, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  line: { width: 3, borderRadius: 2 },
  stepHead: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: HEAD, paddingVertical: space.sm },
});

// ---------- Progress bar ----------

/** Rounded leaf-green fill: how much is done (never time). */
export function ProgressBar({ done, total, noun }: { done: number; total: number; noun: string }) {
  const theme = useAppTheme();
  const c = theme.colors;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${done} of ${total} ${noun} done`}
      style={{ height: 10, borderRadius: radius.pill, backgroundColor: c.surfaceSunken, borderWidth: theme.highContrast ? 1 : 0, borderColor: c.border }}
    >
      <View style={{ width: `${total ? (done / total) * 100 : 0}%`, height: "100%", borderRadius: radius.pill, backgroundColor: c.success }} />
    </View>
  );
}
