// Child home: today's work as a plain status list. One teal action
// starts the next thing; every row says what it is, when it's due,
// and where it stands. The parent entry point sits in the header.

import { Href, router, useFocusEffect } from "expo-router";
import { CalendarDays, ClipboardList, Layers, Lock, Play } from "lucide-react-native";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { AppHeader, BrandMark } from "../components/Brand";
import { Dropdown, PageHeader, StatusList, StatusRow } from "../components/structure";
import type { StatusKind } from "../components/structure";
import { AppText, Button, Screen } from "../components/ui";
import * as db from "../lib/db";
import { nowIso } from "../lib/time";
import { useApp } from "../state/AppProvider";
import { space } from "../theme/theme";

type Filter = "today" | "all" | "subject";

interface Row {
  key: string;
  kind: "session" | "card";
  title: string;
  subject: string;
  meta: string;
  status: StatusKind;
  /** Where tapping goes; rows that can't be acted on yet aren't links. */
  href?: Href;
  dueToday: boolean;
}

interface HomeData {
  greeting: string;
  dateLabel: string;
  stepsThisWeek: number;
  rows: Row[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function greetingFor(date: Date): string {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function dueText(dueAt: string, endOfToday: string): string {
  if (dueAt <= endOfToday) return "Due today";
  return `Due ${new Date(dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export default function ChildHome() {
  const { activeChild, lockParent } = useApp();
  const [data, setData] = useState<HomeData | null>(null);
  const [filter, setFilter] = useState<Filter>("today");

  useFocusEffect(
    useCallback(() => {
      // Coming back here always ends Parent Mode.
      lockParent();
      if (!activeChild) return;
      const now = nowIso();
      const date = new Date(now);
      const startOfToday = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
      const endOfToday = new Date(Date.parse(startOfToday) + DAY_MS - 1).toISOString();
      const weekAgo = new Date(Date.parse(now) - 7 * DAY_MS).toISOString();

      Promise.all([
        db.listSessions(activeChild.id),
        db.listSessionAttempts(activeChild.id),
        db.listReviewCards(activeChild.id),
        db.listReviewAttempts(activeChild.id),
      ]).then(([sessions, attempts, cards, reviews]) => {
        const sessionRows: Row[] = sessions.map((s) => {
          const today = attempts.filter((a) => a.sessionId === s.id && a.startedAt >= startOfToday);
          const status: StatusKind = today.some((a) => a.completedAt)
            ? "done"
            : today.some((a) => a.stepLogs.length > 0)
              ? "in_progress"
              : "not_started";
          const steps = `${s.steps.length} ${s.steps.length === 1 ? "step" : "steps"}`;
          return {
            key: s.id,
            kind: "session",
            title: s.title,
            subject: s.subject,
            meta: [s.subject, steps].filter(Boolean).join(" · "),
            status,
            href: { pathname: "/session/[id]", params: { id: s.id } },
            dueToday: true, // sessions are today's routines
          };
        });

        const practicedToday = new Set(reviews.filter((r) => r.timestamp >= startOfToday).map((r) => r.cardId));
        const cardRows: Row[] = cards.map((card) => {
          const due = card.dueAt <= endOfToday;
          const done = !due && practicedToday.has(card.id);
          return {
            key: card.id,
            kind: "card",
            title: card.front || "Photo card",
            subject: card.subject,
            meta: [card.subject, done ? "Practiced today" : dueText(card.dueAt, endOfToday)].filter(Boolean).join(" · "),
            status: done ? "done" : "not_started",
            href: due ? "/review" : undefined,
            dueToday: due || done,
          };
        });

        setData({
          greeting: greetingFor(date),
          dateLabel: date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
          stepsThisWeek: attempts
            .flatMap((a) => a.stepLogs)
            .filter((l) => l.outcome !== "break" && l.timestamp >= weekAgo).length,
          rows: [...sessionRows, ...cardRows],
        });
      });
    }, [lockParent, activeChild])
  );

  if (!activeChild) {
    return (
      <Screen tone="page" header={<AppHeader />} style={{ justifyContent: "center" }}>
        <View style={{ alignItems: "flex-start", gap: space.lg }}>
          <BrandMark size={48} />
          <View style={{ gap: space.sm }}>
            <AppText variant="title">Welcome to AdaptiveSteps</AppText>
            <AppText muted>
              Step-by-step support for homework and review that adapts to how each learner actually
              does. A parent or teacher sets things up first.
            </AppText>
          </View>
          <Button label="Get started" onPress={() => router.push("/pin")} />
        </View>
      </Screen>
    );
  }

  const parentButton = (
    <Button
      label="Parent"
      icon={Lock}
      variant="outline"
      onPress={() => router.push("/pin")}
      accessibilityHint="Opens Parent Mode. A PIN is required."
      style={{ minHeight: 40, paddingVertical: space.sm, paddingHorizontal: space.md }}
    />
  );

  const rows = data ? (filter === "today" ? data.rows.filter((r) => r.dueToday) : data.rows) : [];
  const nextSession = data?.rows.find((r) => r.kind === "session" && r.status !== "done");
  const dueCards = data?.rows.filter((r) => r.kind === "card" && r.href).length ?? 0;

  // "By subject": one plain list per subject, in first-seen order.
  const groups: [string, Row[]][] =
    filter === "subject"
      ? [...new Set(rows.map((r) => r.subject || "Other"))].map((subj) => [subj, rows.filter((r) => (r.subject || "Other") === subj)])
      : [["", rows]];

  return (
    <Screen tone="page" header={<AppHeader right={parentButton} />}>
      <View style={{ gap: space.xs }}>
        <AppText muted>
          {data?.greeting ?? "Hello"}, {activeChild.name}
        </AppText>
        <PageHeader
          icon={CalendarDays}
          title="Today"
          meta={data ? `${data.dateLabel} · ${data.stepsThisWeek} steps finished this week` : " "}
          right={
            <Dropdown<Filter>
              label="Viewing by"
              value={filter}
              options={[
                { value: "today", label: "Due today" },
                { value: "all", label: "All" },
                { value: "subject", label: "By subject" },
              ]}
              onChange={setFilter}
            />
          }
        />
      </View>

      {nextSession?.href ? (
        <Button label={`Start: ${nextSession.title}`} icon={Play} size="lg" onPress={() => router.push(nextSession.href!)} />
      ) : dueCards > 0 ? (
        <Button label={`Practice ${dueCards} ${dueCards === 1 ? "card" : "cards"}`} icon={Layers} size="lg" onPress={() => router.push("/review")} />
      ) : null}

      {data && rows.length === 0 ? (
        <AppText muted>{"Nothing due today. Ask a grown-up if you'd like something new."}</AppText>
      ) : null}

      {groups.map(([subject, list]) =>
        list.length ? (
          <View key={subject || "all"} style={{ gap: space.sm }}>
            {subject ? (
              <AppText variant="overline" muted>
                {subject}
              </AppText>
            ) : null}
            <StatusList>
              {list.map((r) => (
                <StatusRow
                  key={r.key}
                  icon={r.kind === "session" ? ClipboardList : Layers}
                  title={r.title}
                  meta={r.meta}
                  status={r.status}
                  onPress={r.href ? () => router.push(r.href!) : undefined}
                />
              ))}
            </StatusList>
          </View>
        ) : null
      )}
    </Screen>
  );
}
