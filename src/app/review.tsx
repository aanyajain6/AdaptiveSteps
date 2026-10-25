// ============================================================
// Review session (Child Mode)
// ============================================================
// Due cards as a numbered stepper: the whole set is visible, the
// current card is expanded. The child answers in their head, reveals,
// then says how it went in kind words -- "Not yet" rather than
// "Wrong". No score is shown. Each card is recorded exactly once.

import { Image } from "expo-image";
import { router, Stack } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import { ArrowRight, Check, Eye, House, Layers, Lightbulb, Sparkles, Sprout, Volume2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { Dropdown, PageHeader, Stepper, StepperItem } from "../components/structure";
import { AppText, Button, Icon, Screen } from "../components/ui";
import { recordReview } from "../lib/adaptation";
import * as db from "../lib/db";
import { nextUnfinished, presentCard, stepStatuses } from "../lib/presentation";
import { speak, stopSpeaking } from "../lib/speech";
import { nowIso } from "../lib/time";
import { useApp, useAppTheme } from "../state/AppProvider";
import { MAX_WIDE_CONTENT_WIDTH, radius, space, TABLET_BREAKPOINT } from "../theme/theme";
import { CardOutcome, ReviewCard } from "../types/models";

// Short sessions: retrieval practice works in small doses, and it's
// better to stop while it still feels good.
const MAX_CARDS_PER_SESSION = 10;

type ViewMode = "all" | "current";

const OUTCOMES: { value: CardOutcome; label: string; icon: LucideIcon }[] = [
  { value: "correct", label: "I knew it!", icon: Check },
  { value: "needed_support", label: "I needed a hint", icon: Lightbulb },
  { value: "incorrect", label: "Not yet", icon: Sprout },
];

export default function Review() {
  const { activeChild, theme } = useApp();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const wide = width >= TABLET_BREAKPOINT;

  const [cards, setCards] = useState<ReviewCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);
  const [saving, setSaving] = useState(false);
  const [answered, setAnswered] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  useEffect(() => {
    if (!activeChild) return;
    db.listDueReviewCards(activeChild.id, nowIso()).then((due) =>
      setCards(due.slice(0, MAX_CARDS_PER_SESSION))
    );
    return stopSpeaking;
  }, [activeChild]);

  const card = cards?.[index];
  const view = card ? presentCard(card.back, card.supportTier) : null;
  const ids = cards?.map((k) => k.id) ?? [];
  const answeredLogs = answered.map((id) => ({ stepId: id, outcome: "done" as const }));
  const statuses = stepStatuses(ids, answeredLogs, index, hintRequested ? 1 : 0);
  const isAnswered = !!card && answered.includes(card.id);

  // Read the question aloud (and the answer too, for errorless cards).
  const narrationText =
    card && view && !finished ? (view.answerShownWithPrompt ? `${card.front}\n${card.back}` : card.front) : "";
  useEffect(() => {
    if (narrationText) speak(narrationText.split("\n"));
  }, [narrationText, index]);

  function open(i: number) {
    setIndex(i);
    setRevealed(false);
    setHintRequested(false);
  }

  function reveal() {
    if (!card) return;
    setRevealed(true);
    speak(card.back);
  }

  function advance(nowAnswered: string[]) {
    const next = nextUnfinished(stepStatuses(ids, nowAnswered.map((id) => ({ stepId: id, outcome: "done" as const })), -1, 0), index);
    if (next === null) setFinished(true);
    else open(next);
  }

  async function mark(outcome: CardOutcome) {
    if (!card || saving || isAnswered) return;
    setSaving(true);
    await recordReview(card, outcome, nowIso());
    setSaving(false);
    const nowAnswered = [...answered, card.id];
    setAnswered(nowAnswered);
    advance(nowAnswered);
  }

  if (!cards) return <Screen tone="page">{null}</Screen>;

  const headerOptions = { title: "", headerStyle: { backgroundColor: c.page } };

  if (cards.length === 0 || finished) {
    const practiced = answered.length;
    return (
      <Screen tone="page" style={{ justifyContent: "center" }}>
        <Stack.Screen options={headerOptions} />
        <View style={{ alignItems: "center", gap: space.lg, paddingVertical: space.xl }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSunken }}>
            <Icon icon={practiced > 0 ? Sparkles : Check} size={40} color={c.text} />
          </View>
          <View style={{ alignItems: "center", gap: space.sm }}>
            <AppText variant="display" style={{ textAlign: "center" }}>
              {practiced > 0 ? `You practiced ${practiced} ${practiced === 1 ? "card" : "cards"}!` : "All caught up!"}
            </AppText>
            <AppText muted style={{ textAlign: "center" }}>
              {practiced > 0 ? "Practice like this is how things stick." : "No cards are due right now. Check back later."}
            </AppText>
          </View>
        </View>
        <Button label="Back home" icon={House} size="lg" onPress={() => router.dismissTo("/")} />
      </Screen>
    );
  }

  if (!card || !view) return null;

  const total = cards.length;
  const subjects = [...new Set(cards.map((k) => k.subject).filter(Boolean))].join(", ");
  const items: StepperItem[] = cards.map((k, i) => ({
    key: k.id,
    number: i + 1,
    title: k.front || "Photo card",
    meta: k.subject || undefined,
    status: statuses[i],
  }));
  const visibleItems = viewMode === "current" ? items.filter((it) => it.key === card.id) : items;

  const detail = (
    <CardDetail
      card={card}
      showFront={wide}
      hintVisible={!(revealed || view.answerShownWithPrompt || isAnswered) && (view.hintShown || hintRequested)}
      hint={view.hint}
      answerVisible={revealed || view.answerShownWithPrompt || isAnswered}
      hintOffered={view.hintOffered && !hintRequested}
      isAnswered={isAnswered}
      saving={saving}
      onHint={() => setHintRequested(true)}
      onReveal={reveal}
      onMark={mark}
      onNext={() => advance(answered)}
    />
  );

  return (
    <Screen tone="page" style={wide ? { maxWidth: MAX_WIDE_CONTENT_WIDTH } : undefined}>
      <Stack.Screen options={headerOptions} />
      <View style={{ gap: space.md }}>
        <PageHeader
          icon={Layers}
          title="Review Cards"
          meta={[subjects, `Card ${index + 1} of ${total}`, `${answered.length} done`].filter(Boolean).join(" · ")}
          right={
            <Dropdown<ViewMode>
              label="Viewing by"
              value={viewMode}
              options={[
                { value: "all", label: "All cards" },
                { value: "current", label: "Current card" },
              ]}
              onChange={setViewMode}
            />
          }
        />
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${answered.length} of ${total} cards done`}
          style={{ height: 4, borderRadius: radius.pill, backgroundColor: c.divider }}
        >
          <View style={{ width: `${(answered.length / total) * 100}%`, height: 4, borderRadius: radius.pill, backgroundColor: c.link }} />
        </View>
      </View>

      {wide ? (
        <View style={{ flexDirection: "row", gap: space.xxl, alignItems: "flex-start" }}>
          <View style={{ width: 360 }}>
            <Stepper noun="Card" items={visibleItems} currentKey={card.id} onSelect={(key) => open(ids.indexOf(key))} />
          </View>
          <View style={{ flex: 1, paddingTop: space.sm }}>{detail}</View>
        </View>
      ) : (
        <Stepper
          noun="Card"
          items={visibleItems}
          currentKey={card.id}
          onSelect={(key) => open(ids.indexOf(key))}
          renderExpanded={() => detail}
        />
      )}
    </Screen>
  );
}

function CardDetail({
  card,
  showFront,
  hintVisible,
  hint,
  answerVisible,
  hintOffered,
  isAnswered,
  saving,
  onHint,
  onReveal,
  onMark,
  onNext,
}: {
  card: ReviewCard;
  /** On tablets the front is shown large here; on phones it's the stepper row title. */
  showFront: boolean;
  hintVisible: boolean;
  hint: string;
  answerVisible: boolean;
  hintOffered: boolean;
  isAnswered: boolean;
  saving: boolean;
  onHint: () => void;
  onReveal: () => void;
  onMark: (o: CardOutcome) => void;
  onNext: () => void;
}) {
  const theme = useAppTheme();
  const c = theme.colors;

  return (
    <View style={{ gap: space.lg }}>
      {showFront && card.front ? <AppText variant="display">{card.front}</AppText> : null}
      {card.frontPhotoUri ? (
        <Image
          source={{ uri: card.frontPhotoUri }}
          accessibilityLabel={card.front ? `Picture for: ${card.front}` : "Question picture"}
          contentFit="contain"
          style={{ width: "70%", aspectRatio: 4 / 3, borderRadius: radius.sm }}
        />
      ) : null}

      {hintVisible ? (
        <View
          accessible
          accessibilityLabel={`Hint: starts with ${hint[0]}`}
          style={{ flexDirection: "row", alignItems: "center", gap: space.sm, alignSelf: "flex-start", paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.sm, backgroundColor: c.surfaceSunken }}
        >
          <Icon icon={Lightbulb} size={18} color={c.textMuted} />
          <AppText variant="heading">{hint}</AppText>
        </View>
      ) : null}

      {answerVisible ? (
        <View
          accessibilityLiveRegion="polite"
          style={{ padding: space.lg, borderRadius: radius.sm, borderWidth: theme.borderWidth, borderColor: c.borderStrong }}
        >
          <AppText variant="overline" muted>
            Answer
          </AppText>
          <AppText variant="display">{card.back}</AppText>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hear it again"
        onPress={() => speak(answerVisible ? [card.front, card.back] : card.front)}
        style={{ flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 32, alignSelf: "flex-start" }}
      >
        <Icon icon={Volume2} size={18} color={c.link} />
        <AppText variant="label" style={{ color: c.link }}>
          Hear it again
        </AppText>
      </Pressable>

      <View style={{ gap: space.sm }}>
        {isAnswered ? (
          <Button label="Next card" icon={ArrowRight} size="lg" onPress={onNext} />
        ) : !answerVisible ? (
          <>
            <Button label="Show answer" icon={Eye} size="lg" onPress={onReveal} />
            {hintOffered ? <Button label="Show a hint" icon={Lightbulb} variant="outline" onPress={onHint} /> : null}
          </>
        ) : (
          <>
            <AppText variant="label">How did it go?</AppText>
            {OUTCOMES.map((o) => (
              <Button
                key={o.value}
                label={o.label}
                icon={o.icon}
                size={o.value === "correct" ? "lg" : "md"}
                variant={o.value === "correct" ? "primary" : "outline"}
                disabled={saving}
                onPress={() => onMark(o.value)}
              />
            ))}
          </>
        )}
      </View>
    </View>
  );
}
