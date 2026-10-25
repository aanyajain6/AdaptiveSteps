// Child home. One glance answers "what can I do right now?": the two
// activities with what's ready in each, and a small, positive-only
// look at the week. The parent entry point sits in the header, out
// of the way of the main actions.

import { router, useFocusEffect } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import { ChevronRight, ClipboardList, Layers, Lock, Play } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { AppHeader, BrandMark } from "../components/Brand";
import { AppText, Badge, Button, Card, Icon, IconTile, ListGroup, ListRow, Screen, Section } from "../components/ui";
import * as db from "../lib/db";
import { nowIso } from "../lib/time";
import { useApp, useAppTheme } from "../state/AppProvider";
import { StudySession } from "../types/models";
import { radius, space } from "../theme/theme";

interface HomeData {
  greeting: string;
  dateLabel: string;
  /** Least recently practiced first, never-tried sessions before all others. */
  sessions: StudySession[];
  dueCount: number;
  stepsThisWeek: number;
  cardsThisWeek: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function greetingFor(date: Date): string {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function ChildHome() {
  const { activeChild, lockParent } = useApp();
  const [data, setData] = useState<HomeData | null>(null);

  useFocusEffect(
    useCallback(() => {
      // Coming back here always ends Parent Mode.
      lockParent();
      if (!activeChild) return;
      const now = nowIso();
      const weekAgo = new Date(Date.parse(now) - WEEK_MS).toISOString();
      Promise.all([
        db.listSessions(activeChild.id),
        db.listDueReviewCards(activeChild.id, now),
        db.listSessionAttempts(activeChild.id),
        db.listReviewAttempts(activeChild.id),
      ]).then(([sessions, due, attempts, reviews]) => {
        const date = new Date(now);
        const lastTried = (id: string) =>
          attempts.filter((a) => a.sessionId === id).reduce((m, a) => (a.startedAt > m ? a.startedAt : m), "");
        setData({
          greeting: greetingFor(date),
          dateLabel: date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
          sessions: [...sessions].sort((a, b) => lastTried(a.id).localeCompare(lastTried(b.id))),
          dueCount: due.length,
          stepsThisWeek: attempts
            .flatMap((a) => a.stepLogs)
            .filter((l) => l.outcome !== "break" && l.timestamp >= weekAgo).length,
          cardsThisWeek: reviews.filter((r) => r.timestamp >= weekAgo).length,
        });
      });
    }, [lockParent, activeChild])
  );

  if (!activeChild) {
    return (
      <Screen header={<AppHeader />} style={{ justifyContent: "center" }}>
        <Card raised style={{ alignItems: "flex-start", gap: space.lg, padding: space.xl }}>
          <BrandMark size={48} />
          <View style={{ gap: space.sm }}>
            <AppText variant="title">Welcome to AdaptiveSteps</AppText>
            <AppText muted>
              Step-by-step support for homework and review that adapts to how each learner actually
              does. A parent or teacher sets things up first.
            </AppText>
          </View>
          <Button label="Get started" onPress={() => router.push("/pin")} />
        </Card>
      </Screen>
    );
  }

  const parentButton = (
    <Button
      label="Parent"
      icon={Lock}
      variant="secondary"
      onPress={() => router.push("/pin")}
      accessibilityHint="Opens Parent Mode. A PIN is required."
      style={{ minHeight: 40, paddingVertical: space.sm, paddingHorizontal: space.md }}
    />
  );

  return (
    <Screen header={<AppHeader right={parentButton} />}>
      <View style={{ gap: space.xs, paddingTop: space.sm }}>
        <AppText variant="overline" muted>
          {data?.dateLabel ?? " "}
        </AppText>
        <AppText variant="display">
          {data?.greeting ?? "Hello"}, {activeChild.name}
        </AppText>
      </View>

      {data && <UpNext session={data.sessions[0]} />}

      <Section title="Practice">
        <ActivityCard
          icon={Layers}
          title="Practice cards"
          detail={!data ? " " : data.dueCount === 0 ? "All caught up. Nice work!" : "A quick review to help it stick."}
          count={data?.dueCount}
          countLabel="due"
          onPress={() => router.push("/review")}
        />
      </Section>

      {data && data.sessions.length > 1 && (
        <Section title="More sessions">
          <ListGroup>
            {data.sessions.slice(1, 4).map((s) => (
              <ListRow
                key={s.id}
                icon={ClipboardList}
                title={s.title}
                subtitle={stepsLabel(s)}
                onPress={() => router.push({ pathname: "/session/[id]", params: { id: s.id } })}
              />
            ))}
            {data.sessions.length > 4 && (
              <ListRow title="See all sessions" onPress={() => router.push("/sessions")} />
            )}
          </ListGroup>
        </Section>
      )}

      <Section title="This week">
        <View style={{ flexDirection: "row", gap: space.md }}>
          <Stat value={data?.stepsThisWeek} label="Steps finished" />
          <Stat value={data?.cardsThisWeek} label="Cards practiced" />
        </View>
      </Section>
    </Screen>
  );
}

function stepsLabel(s: StudySession): string {
  const n = `${s.steps.length} ${s.steps.length === 1 ? "step" : "steps"}`;
  return s.subject ? `${s.subject} · ${n}` : n;
}

/** The session to do next, with one clear Start action. */
function UpNext({ session }: { session?: StudySession }) {
  const theme = useAppTheme();
  if (!session) {
    return (
      <Section title="Up next">
        <Card style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
          <IconTile icon={ClipboardList} size={48} tone="neutral" />
          <View style={{ flex: 1, gap: space.xs }}>
            <AppText variant="heading">No study sessions yet</AppText>
            <AppText variant="caption" muted>
              Ask a grown-up to add one.
            </AppText>
          </View>
        </Card>
      </Section>
    );
  }
  return (
    <Section title="Up next">
      <Card raised style={{ gap: space.lg, padding: space.xl }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
          <IconTile icon={ClipboardList} size={48} />
          <View style={{ flex: 1, gap: space.xs }}>
            <AppText variant="title">{session.title}</AppText>
            <AppText variant="caption" muted>
              {stepsLabel(session)}
            </AppText>
          </View>
        </View>
        <AppText muted style={{ fontSize: theme.font(15) }}>
          One step at a time, at your own pace. Help and breaks are always there.
        </AppText>
        <Button
          label="Start"
          icon={Play}
          size="lg"
          onPress={() => router.push({ pathname: "/session/[id]", params: { id: session.id } })}
        />
      </Card>
    </Section>
  );
}

function Stat({ value, label }: { value?: number; label: string }) {
  const theme = useAppTheme();
  return (
    <Card style={{ flex: 1, gap: space.xs }}>
      <AppText variant="title" style={{ fontSize: theme.font(28), lineHeight: theme.font(34) }}>
        {value ?? "–"}
      </AppText>
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </Card>
  );
}

function ActivityCard({
  icon,
  title,
  detail,
  count,
  countLabel,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  count?: number;
  countLabel: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${count ?? 0} ${countLabel}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: space.lg,
          padding: space.lg,
          borderRadius: radius.lg,
          backgroundColor: pressed ? theme.colors.surfaceSunken : theme.colors.surface,
          transform: pressed && !theme.reduceMotion ? [{ scale: 0.99 }] : undefined,
        },
        theme.elevation.raised,
      ]}
    >
      <IconTile icon={icon} size={48} />
      <View style={{ flex: 1, gap: space.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" }}>
          <AppText variant="heading">{title}</AppText>
          {count ? <Badge label={`${count} ${countLabel}`} /> : null}
        </View>
        <AppText variant="caption" muted>
          {detail}
        </AppText>
      </View>
      <Icon icon={ChevronRight} size={20} color={theme.colors.textMuted} />
    </Pressable>
  );
}
