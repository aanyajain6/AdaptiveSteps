// ============================================================
// Structured layout primitives
// ============================================================
// Information-dense, list-first building blocks: a page header with a
// "Viewing by" filter, status list rows, and a numbered vertical
// stepper. Deliberately flat: hairline dividers, no cards or shadows,
// and the accent color only on links, the active step, and progress.

import type { LucideIcon } from "lucide-react-native";
import {
  Check,
  ChevronDown,
  Circle,
  CircleCheck,
  CircleDot,
  CirclePlus,
  CircleQuestionMark,
} from "lucide-react-native";
import React, { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { STEP_STATUS_LABELS, StepStatus } from "../lib/presentation";
import { useAppTheme } from "../state/AppProvider";
import { MIN_TOUCH, radius, space } from "../theme/theme";
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
  const theme = useAppTheme();
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, flexWrap: "wrap" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, flexShrink: 1, flexGrow: 1 }}>
          <Icon icon={icon} size={22} color={theme.colors.text} />
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
    trigger.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y: y + height + 4, width }));
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
          {
            borderColor: c.borderStrong,
            borderWidth: theme.borderWidth,
            backgroundColor: pressed ? c.surfaceSunken : c.page,
          },
        ]}
      >
        <Text style={[theme.type("caption"), { color: c.textMuted }]}>{label}:</Text>
        <Text style={[theme.type("label"), { fontSize: theme.font(14), color: c.text }]}>{current}</Text>
        <Icon icon={ChevronDown} size={16} color={c.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={close}>
        {/* Transparent backdrop: closes on outside tap. No scrim, no shadow -- a flat bordered panel. */}
        <Pressable accessibilityLabel="Close" onPress={close} style={{ flex: 1 }}>
          <View
            accessibilityRole="menu"
            style={{
              position: "absolute",
              top: anchor?.y ?? 0,
              // Right-align with the trigger, never narrower than it, never off-screen.
              right: Math.max(space.sm, windowWidth - (anchor ? anchor.x + anchor.width : windowWidth)),
              minWidth: Math.max(220, anchor?.width ?? 0),
              borderRadius: radius.sm,
              backgroundColor: c.page,
              borderWidth: theme.borderWidth,
              borderColor: c.borderStrong,
              paddingVertical: space.xs,
            }}
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
                    paddingHorizontal: space.lg,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: pressed ? c.surfaceSunken : "transparent",
                  })}
                >
                  <AppText variant={selected ? "label" : "body"}>{o.label}</AppText>
                  {selected ? <Icon icon={Check} size={18} color={c.link} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ---------- Status indicator ----------

export type StatusKind = StepStatus | "extra_support";

const STATUS: Record<StatusKind, { icon: LucideIcon; label: string }> = {
  not_started: { icon: Circle, label: STEP_STATUS_LABELS.not_started },
  in_progress: { icon: CircleDot, label: STEP_STATUS_LABELS.in_progress },
  needs_help: { icon: CircleQuestionMark, label: STEP_STATUS_LABELS.needs_help },
  done: { icon: CircleCheck, label: STEP_STATUS_LABELS.done },
  extra_support: { icon: CirclePlus, label: "Extra Support" },
};

/** Outlined circle glyph + plain-language label, all in the same muted ink. */
export function StatusIndicator({ status }: { status: StatusKind }) {
  const theme = useAppTheme();
  const { icon, label } = STATUS[status];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Icon icon={icon} size={16} color={theme.colors.textMuted} />
      <Text style={[theme.type("caption"), { color: theme.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

// ---------- Status list ----------

/** Plain list with hairline dividers. No card, no shadow. */
export function StatusList({ children }: { children: React.ReactNode }) {
  const theme = useAppTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ borderTopWidth: hairline(theme.highContrast), borderBottomWidth: hairline(theme.highContrast), borderColor: theme.colors.divider }}>
      {items.map((child, i) => (
        <View key={i} style={i > 0 ? { borderTopWidth: hairline(theme.highContrast), borderTopColor: theme.colors.divider } : undefined}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function StatusRow({
  icon,
  title,
  meta,
  status,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  meta?: string;
  status: StatusKind;
  onPress?: () => void;
}) {
  const theme = useAppTheme();
  const c = theme.colors;
  return (
    <Pressable
      disabled={!onPress}
      accessibilityRole={onPress ? "link" : undefined}
      accessibilityLabel={[title, meta, STATUS[status].label].filter(Boolean).join(", ")}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.surfaceSunken : "transparent" }]}
    >
      <Icon icon={icon} size={18} color={c.textMuted} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="label" style={{ color: onPress ? c.link : c.text }} numberOfLines={2}>
          {title}
        </AppText>
        {meta ? (
          <AppText variant="caption" muted numberOfLines={1}>
            {meta}
          </AppText>
        ) : null}
      </View>
      <StatusIndicator status={status} />
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
  status: StepStatus;
}

/**
 * Numbered circles joined by a vertical line, one row per step:
 * done = check, current = filled accent, upcoming = outlined + muted.
 * The line below a finished step fills with the accent (progress).
 * `renderExpanded` draws the active step's content under its row.
 */
export function Stepper({
  items,
  currentKey,
  onSelect,
  renderExpanded,
  noun = "Step",
}: {
  /** What each item is called for assistive tech ("Step 2", "Card 2"). */
  noun?: string;
  items: StepperItem[];
  currentKey: string;
  onSelect?: (key: string) => void;
  renderExpanded?: (item: StepperItem) => React.ReactNode;
}) {
  const theme = useAppTheme();
  const c = theme.colors;

  return (
    <View accessibilityRole="list">
      {items.map((item, i) => {
        const isCurrent = item.key === currentKey;
        const isDone = item.status === "done";
        const first = i === 0;
        const last = i === items.length - 1;
        const lineAbove = !first && items[i - 1].status === "done" ? c.link : c.divider;
        const lineBelow = isDone ? c.link : c.divider;

        const circle = isCurrent ? (
          <View style={[styles.node, { backgroundColor: c.link, borderColor: c.link }]}>
            <Text style={[theme.type("label"), { fontSize: 13, color: c.onInk }]}>{item.number}</Text>
          </View>
        ) : isDone ? (
          <View style={[styles.node, { backgroundColor: c.page, borderColor: c.link }]}>
            <Icon icon={Check} size={14} color={c.link} />
          </View>
        ) : (
          <View style={[styles.node, { backgroundColor: c.page, borderColor: c.borderStrong }]}>
            <Text style={[theme.type("caption"), { fontSize: 13, color: c.textMuted }]}>{item.number}</Text>
          </View>
        );

        return (
          <View key={item.key} accessibilityRole="none" style={{ flexDirection: "row" }}>
            {/* Rail: line in, circle, line out. */}
            <View style={{ width: 40, alignItems: "center" }}>
              <View style={{ width: 2, height: 14, backgroundColor: first ? "transparent" : lineAbove }} />
              {circle}
              <View style={{ width: 2, flex: 1, minHeight: 14, backgroundColor: last ? "transparent" : lineBelow }} />
            </View>

            <View
              style={{
                flex: 1,
                paddingBottom: last ? 0 : space.sm,
                borderBottomWidth: last ? 0 : hairline(theme.highContrast),
                borderBottomColor: c.divider,
              }}
            >
              <Pressable
                disabled={!onSelect || isCurrent}
                accessibilityRole="button"
                accessibilityState={{ selected: isCurrent }}
                // "current" is in the label because web drops the selected state on buttons.
                accessibilityLabel={`${noun} ${item.number}${isCurrent ? ", current" : ""}: ${item.title}. ${STATUS[item.status].label}.`}
                accessibilityHint={isCurrent ? undefined : "Go to this step"}
                onPress={() => onSelect?.(item.key)}
                style={({ pressed }) => [styles.stepHead, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText
                    variant={isCurrent ? "heading" : "label"}
                    style={{ color: isCurrent ? c.text : item.status === "not_started" ? c.textMuted : c.link }}
                    numberOfLines={isCurrent ? undefined : 2}
                  >
                    {item.title}
                  </AppText>
                  {item.meta ? (
                    <AppText variant="caption" muted numberOfLines={1}>
                      {item.meta}
                    </AppText>
                  ) : null}
                </View>
                <StatusIndicator status={item.status} />
              </Pressable>
              {isCurrent && renderExpanded ? <View style={{ paddingBottom: space.md }}>{renderExpanded(item)}</View> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function hairline(highContrast: boolean) {
  return highContrast ? 1 : StyleSheet.hairlineWidth;
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
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 64, paddingVertical: space.md, paddingHorizontal: space.xs },
  node: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  stepHead: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 56, paddingVertical: space.sm },
});
