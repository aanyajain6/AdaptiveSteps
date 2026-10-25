// ============================================================
// Parent Dashboard
// ============================================================
// Pending approvals come first: they're the only thing here that
// needs the parent to act. Everything the engine changed is listed
// with its plain-language reason, so nothing is a black box.

import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit/v2";
import { ChartCard, chartTheme } from "../../components/ChartCard";
import { MOODS } from "../../components/MoodCheckIn";
import { Check, Info, ShieldCheck } from "lucide-react-native";
import { AppText, Badge, Button, Card, Icon, IconTile, Screen, Section } from "../../components/ui";
import { approveAdjustment, declineAdjustment, isPending } from "../../lib/adaptation";
import * as db from "../../lib/db";
import {
  hardestSteps,
  independentCompletion,
  mastery,
  MASTERY_INTERVAL_DAYS,
  promptsPerAttempt,
  weeklyRetention,
} from "../../lib/stats";
import { CARD_TIER_LABELS, TIER_LABELS } from "../../lib/tiers";
import { nowIso } from "../../lib/time";
import { useApp } from "../../state/AppProvider";
import { radius, space } from "../../theme/theme";
import {
  AdaptiveAdjustment,
  Mood,
  ReviewAttempt,
  ReviewCard,
  SessionAttempt,
  StudySession,
  SupportTier,
} from "../../types/models";

interface Data {
  sessions: StudySession[];
  attempts: SessionAttempt[];
  cards: ReviewCard[];
  reviews: ReviewAttempt[];
  adjustments: AdaptiveAdjustment[];
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const pct = (r: number) => `${Math.round(r * 100)}%`;
const moodEmoji = (m?: Mood) => MOODS.find((x) => x.value === m)?.emoji ?? "–";

export default function Dashboard() {
  const { activeChild, theme } = useApp();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<Data | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!activeChild) return;
    const id = activeChild.id;
    const [sessions, attempts, cards, reviews, adjustments] = await Promise.all([
      db.listSessions(id),
      db.listSessionAttempts(id),
      db.listReviewCards(id),
      db.listReviewAttempts(id),
      db.listAdjustments(id),
    ]);
    setData({ sessions, attempts, cards, reviews, adjustments });
  }, [activeChild]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!activeChild) {
    return (
      <Screen>
        <AppText muted>Create a child profile to see progress here.</AppText>
      </Screen>
    );
  }
  if (!data) return <Screen>{null}</Screen>;

  // Screen padding (20) + card padding (16), both sides; capped for tablets.
  const chartWidth = Math.min(width, 700) - 72;
  const ct = chartTheme(theme);

  function itemName(adj: AdaptiveAdjustment): string {
    if (adj.itemType === "review_card") {
      const card = data!.cards.find((c) => c.id === adj.itemId);
      return card ? `Card: ${card.front || "(photo card)"}` : "A deleted card";
    }
    for (const s of data!.sessions) {
      const step = s.steps.find((st) => st.id === adj.itemId);
      if (step) return `${s.title}: "${step.label}"`;
    }
    return "A deleted step";
  }

  const tierName = (adj: AdaptiveAdjustment, tier: SupportTier) =>
    (adj.itemType === "review_card" ? CARD_TIER_LABELS : TIER_LABELS)[tier];

  async function approve(adj: AdaptiveAdjustment) {
    const applied = await approveAdjustment(adj, nowIso());
    setNotice(
      applied
        ? `Done — ${itemName(adj)} now uses "${tierName(adj, adj.toTier)}".`
        : "That suggestion was out of date (support had already changed), so nothing was applied."
    );
    load();
  }

  async function decline(adj: AdaptiveAdjustment) {
    await declineAdjustment(adj, nowIso());
    setNotice("Kept the current support. The app will check again after more practice.");
    load();
  }

  const pending = data.adjustments
    .filter(isPending)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const history = data.adjustments
    .filter((a) => !pending.includes(a))
    .sort((a, b) => (b.resolvedAt ?? b.createdAt).localeCompare(a.resolvedAt ?? a.createdAt))
    .slice(0, 10);

  const prompts = promptsPerAttempt(data.attempts).map((p) => ({ ...p, label: shortDate(p.date) }));
  const independent = independentCompletion(data.attempts);
  const recentIndependent = independentCompletion(
    [...data.attempts].sort((a, b) => a.startedAt.localeCompare(b.startedAt)).slice(-5)
  );
  const hardest = hardestSteps(data.attempts, data.sessions);
  const retention = weeklyRetention(data.reviews).map((w) => ({
    ...w,
    label: shortDate(w.weekStart),
    percent: Math.round(w.rate * 100),
  }));
  const mastered = mastery(data.cards);
  const tierCounts = ([0, 1, 2, 3] as SupportTier[]).map((t) => ({
    tier: CARD_TIER_LABELS[t],
    cards: data.cards.filter((c) => c.supportTier === t).length,
  }));
  const maxTierCount = Math.max(1, ...tierCounts.map((t) => t.cards));
  const recent = [...data.attempts].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 5);

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <AppText variant="overline" muted>
          Learner
        </AppText>
        <AppText variant="display">{activeChild.name}</AppText>
      </View>

      {/* ---- Needs your review ---- */}
      {pending.length > 0 && (
        <Card raised style={{ gap: space.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <IconTile icon={ShieldCheck} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="heading">Needs your review</AppText>
              <AppText variant="caption" muted>
                Support is only reduced with your approval.
              </AppText>
            </View>
            <Badge label={String(pending.length)} />
          </View>
          {pending.map((adj) => (
            <View
              key={adj.id}
              style={{ gap: space.sm, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: theme.colors.border }}
            >
              <AppText variant="label">{itemName(adj)}</AppText>
              <AppText>{adj.reason}</AppText>
              <AppText variant="caption" muted>
                {tierName(adj, adj.fromTier)} → {tierName(adj, adj.toTier)} · Suggested {shortDate(adj.createdAt)}
              </AppText>
              <View style={{ flexDirection: "row", gap: space.sm, paddingTop: space.xs }}>
                <Button label="Approve" icon={Check} onPress={() => approve(adj)} style={{ flex: 1 }} />
                <Button label="Not yet" variant="secondary" onPress={() => decline(adj)} style={{ flex: 1 }} />
              </View>
            </View>
          ))}
        </Card>
      )}
      {notice ? (
        <View
          accessibilityLiveRegion="polite"
          style={{ flexDirection: "row", gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: theme.colors.primarySoft }}
        >
          <Icon icon={Info} size={18} color={theme.colors.primary} />
          <AppText variant="caption" style={{ flex: 1, color: theme.colors.text }}>
            {notice}
          </AppText>
        </View>
      ) : null}

      {/* ---- Headline numbers ---- */}
      <Section title="At a glance">
        <View style={{ flexDirection: "row", gap: space.md }}>
          <StatTile
            label="Steps done without help"
            value={independent.rate === null ? "–" : pct(independent.rate)}
            detail={
              independent.rate === null
                ? "No steps yet"
                : `Last 5 sessions: ${recentIndependent.rate === null ? "–" : pct(recentIndependent.rate)}`
            }
          />
          <StatTile
            label="Cards mastered"
            value={`${mastered.mastered}/${mastered.total}`}
            detail={`Recalled alone, ${MASTERY_INTERVAL_DAYS}+ days apart`}
          />
        </View>
      </Section>

      {/* ---- Study sessions ---- */}
      <Section title="Study sessions">
        <ChartCard
          title="Prompts needed per session"
          explanation="How many times help was asked for in each session. Going down over time means more independence."
          summary={
            prompts.length
              ? `Prompts per session, last ${prompts.length}: ${prompts.map((p) => p.prompts).join(", ")}.`
              : "No sessions yet."
          }
          rows={prompts.map((p) => [p.label, `${p.prompts} ${p.prompts === 1 ? "prompt" : "prompts"}`])}
          empty={prompts.length < 2 ? "This chart appears after two sessions." : undefined}
        >
          <LineChart
            data={prompts}
            xKey="label"
            yKey="prompts"
            width={chartWidth}
            height={200}
            theme={ct}
            yDomain={{ min: 0, includeZero: true }}
            formatYLabel={(v) => String(Math.round(v))}
            tooltip
            showVerticalGridLines={false}
          />
        </ChartCard>

        <Card>
          <View style={{ gap: space.xs }}>
            <AppText variant="heading">Hardest steps</AppText>
            <AppText variant="caption" muted>
              {"Where help was asked for most often. Breaks don't count."}
            </AppText>
          </View>
          {hardest.length === 0 ? (
            <AppText muted>Nothing has needed help yet.</AppText>
          ) : (
            hardest.map((s) => (
              <View
                key={s.stepId}
                accessible
                accessibilityLabel={`${s.label}, in ${s.sessionTitle}: needed help ${pct(s.helpRate)} of ${s.attempts} times`}
                style={{ gap: 6 }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
                  <AppText variant="label" style={{ flex: 1 }}>
                    {s.label}
                  </AppText>
                  <AppText variant="label">{pct(s.helpRate)}</AppText>
                </View>
                <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: theme.colors.surfaceSunken }}>
                  <View
                    style={{
                      width: `${Math.max(4, s.helpRate * 100)}%`,
                      height: 6,
                      borderRadius: radius.pill,
                      backgroundColor: theme.colors.chart,
                    }}
                  />
                </View>
                <AppText variant="caption" muted>
                  {s.sessionTitle} · {s.attempts} {s.attempts === 1 ? "try" : "tries"}
                </AppText>
              </View>
            ))
          )}
        </Card>

      </Section>

      {/* ---- Review cards ---- */}
      <Section title="Review cards">
        <ChartCard
          title="Review card retention"
          explanation="Share of review answers recalled without a hint, by week."
          summary={
            retention.length
              ? `Weekly retention: ${retention.map((w) => `${w.label} ${w.percent}%`).join(", ")}.`
              : "No reviews yet."
          }
          rows={retention.map((w) => [`Week of ${w.label}`, `${w.percent}% of ${w.reviews}`])}
          empty={retention.length < 2 ? "This chart appears after two weeks of practice." : undefined}
        >
          <LineChart
            data={retention}
            xKey="label"
            yKey="percent"
            width={chartWidth}
            height={200}
            theme={ct}
            yDomain={[0, 100]}
            formatYLabel={(v) => `${Math.round(v)}%`}
            tooltip
            showVerticalGridLines={false}
          />
        </ChartCard>

        <ChartCard
          title="Cards by support level"
          explanation="Where each card is now. Cards move toward “Recall on own” as they're learned."
          summary={`Cards by support level: ${tierCounts.map((t) => `${t.tier} ${t.cards}`).join(", ")}.`}
          rows={tierCounts.map((t) => [t.tier, String(t.cards)])}
          empty={data.cards.length === 0 ? "No review cards yet." : undefined}
        >
          <BarChart
            data={tierCounts}
            xKey="tier"
            yKey="cards"
            orientation="horizontal"
            width={chartWidth}
            height={180}
            theme={ct}
            barRadius={4}
            showValuesOnTopOfBars
            // Whole-card ticks only, with headroom so the end value label isn't clipped.
            yDomain={[0, maxTierCount + 1]}
            yTickCount={Math.min(maxTierCount + 1, 5) + 1}
            formatYLabel={(v) => (Number.isInteger(v) ? String(v) : "")}
            tooltip={false}
          />
        </ChartCard>

      </Section>

      {/* ---- Recent sessions with mood ---- */}
      <Section title="Activity">
        <Card>
          <AppText variant="heading">Recent sessions</AppText>
          {recent.length === 0 && <AppText muted>No sessions yet.</AppText>}
          {recent.map((a) => {
            const title = data.sessions.find((s) => s.id === a.sessionId)?.title ?? "Deleted session";
            const steps = a.stepLogs.filter((l) => l.outcome !== "break").length;
            const breaks = a.stepLogs.filter((l) => l.outcome === "break").length;
            return (
              <View key={a.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="label">{title}</AppText>
                  <AppText variant="caption" muted>
                    {shortDate(a.startedAt)} · {steps} {steps === 1 ? "step" : "steps"}
                    {breaks ? ` · ${breaks} ${breaks === 1 ? "break" : "breaks"}` : ""}
                    {a.completedAt ? "" : " · stopped early"}
                  </AppText>
                </View>
                <AppText
                  accessibilityLabel={`Mood before ${a.moodBefore ?? "not given"}, after ${a.moodAfter ?? "not given"}`}
                  style={{ fontSize: theme.font(22) }}
                >
                  {moodEmoji(a.moodBefore)} → {moodEmoji(a.moodAfter)}
                </AppText>
              </View>
            );
          })}
        </Card>

        {/* ---- Explainable log ---- */}
        <Card>
          <AppText variant="heading">Why support changed</AppText>
          {history.length === 0 && <AppText muted>No changes yet.</AppText>}
          {history.map((adj) => (
            <View key={adj.id} style={{ gap: 2 }}>
              <AppText variant="label">{itemName(adj)}</AppText>
              <AppText>{adj.reason}</AppText>
              <AppText variant="caption" muted>
                {tierName(adj, adj.fromTier)} → {tierName(adj, adj.toTier)} · {shortDate(adj.resolvedAt ?? adj.createdAt)} ·{" "}
                {statusText(adj)}
              </AppText>
            </View>
          ))}
        </Card>
      </Section>
    </Screen>
  );
}

function StatTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card style={{ flex: 1, gap: space.xs }}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="display">{value}</AppText>
      <AppText variant="caption" muted>
        {detail}
      </AppText>
    </Card>
  );
}

function statusText(adj: AdaptiveAdjustment): string {
  switch (adj.status) {
    case "declined":
      return "you said not yet";
    case "superseded":
      return "replaced by a newer change";
    default:
      return adj.requiresParentApproval ? "you approved" : "applied automatically";
  }
}
