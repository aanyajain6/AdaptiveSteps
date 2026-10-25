// ============================================================
// Review session (Child Mode)
// ============================================================
// Pulls only cards that are due, a few at a time. The child answers
// in their head, reveals, then says how it went in kind words --
// "Not yet" rather than "Wrong". No score is shown.

import { Image } from "expo-image";
import { router } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import { Check, Eye, House, Lightbulb, Sparkles, Sprout, Volume2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { AppText, Button, Card, Icon, Screen } from "../components/ui";
import { recordReview } from "../lib/adaptation";
import * as db from "../lib/db";
import { presentCard } from "../lib/presentation";
import { speak, stopSpeaking } from "../lib/speech";
import { nowIso } from "../lib/time";
import { useApp } from "../state/AppProvider";
import { radius, space } from "../theme/theme";
import { CardOutcome, ReviewCard } from "../types/models";

// Short sessions: retrieval practice works in small doses, and it's
// better to stop while it still feels good.
const MAX_CARDS_PER_SESSION = 10;

const OUTCOMES: { value: CardOutcome; label: string; icon: LucideIcon }[] = [
  { value: "correct", label: "I knew it!", icon: Check },
  { value: "needed_support", label: "I needed a hint", icon: Lightbulb },
  { value: "incorrect", label: "Not yet", icon: Sprout },
];

export default function Review() {
  const { activeChild, theme } = useApp();
  const [cards, setCards] = useState<ReviewCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeChild) return;
    db.listDueReviewCards(activeChild.id, nowIso()).then((due) =>
      setCards(due.slice(0, MAX_CARDS_PER_SESSION))
    );
    return stopSpeaking;
  }, [activeChild]);

  const card = cards?.[index];
  const view = card ? presentCard(card.back, card.supportTier) : null;

  // Read the question aloud (and the answer too, for errorless cards).
  const narrationText =
    card && view ? (view.answerShownWithPrompt ? `${card.front}\n${card.back}` : card.front) : "";
  useEffect(() => {
    if (narrationText) speak(narrationText.split("\n"));
  }, [narrationText, index]);

  function reveal() {
    if (!card) return;
    setRevealed(true);
    speak(card.back);
  }

  async function mark(outcome: CardOutcome) {
    if (!card || saving) return;
    setSaving(true);
    await recordReview(card, outcome, nowIso());
    setSaving(false);
    setRevealed(false);
    setHintRequested(false);
    setIndex((i) => i + 1);
  }

  if (!cards) return <Screen>{null}</Screen>;

  if (cards.length === 0 || index >= cards.length) {
    const practiced = index;
    const c = theme.colors;
    return (
      <Screen style={{ justifyContent: "center" }}>
        <View style={{ alignItems: "center", gap: space.lg, paddingVertical: space.xl }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: practiced > 0 ? c.primary : c.primarySoft,
            }}
          >
            <Icon icon={practiced > 0 ? Sparkles : Check} size={44} color={practiced > 0 ? c.onPrimary : c.primary} />
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
  const answerVisible = revealed || view.answerShownWithPrompt;
  const hintVisible = !answerVisible && (view.hintShown || hintRequested);
  const c = theme.colors;

  return (
    <Screen>
      <View accessible accessibilityLabel={`Card ${index + 1} of ${cards.length}`} style={{ gap: space.sm }}>
        <AppText variant="overline" muted>
          Card {index + 1} of {cards.length}
        </AppText>
        <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: c.borderStrong }}>
          <View
            style={{
              width: `${(index / cards.length) * 100}%`,
              height: 6,
              borderRadius: radius.pill,
              backgroundColor: c.primary,
            }}
          />
        </View>
      </View>

      <Card raised style={{ alignItems: "center", gap: space.lg, paddingVertical: space.xxl, paddingHorizontal: space.xl }}>
        {card.subject ? (
          <AppText variant="overline" muted>
            {card.subject}
          </AppText>
        ) : null}
        {card.frontPhotoUri && (
          <Image
            source={{ uri: card.frontPhotoUri }}
            accessibilityLabel={card.front ? `Picture for: ${card.front}` : "Question picture"}
            contentFit="contain"
            style={{ width: "80%", aspectRatio: 4 / 3, borderRadius: radius.md }}
          />
        )}
        {card.front ? (
          <AppText variant="display" style={{ textAlign: "center", fontSize: theme.font(34), lineHeight: theme.font(40) }}>
            {card.front}
          </AppText>
        ) : null}

        {hintVisible && (
          <View
            accessible
            accessibilityLabel={`Hint: starts with ${view.hint[0]}`}
            style={{ flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill, backgroundColor: c.primarySoft }}
          >
            <Icon icon={Lightbulb} size={18} color={c.primary} />
            <AppText variant="heading" style={{ color: c.primary }}>
              {view.hint}
            </AppText>
          </View>
        )}

        {answerVisible && (
          <View
            accessibilityLiveRegion="polite"
            style={{ alignSelf: "stretch", padding: space.lg, borderRadius: radius.md, backgroundColor: c.primarySoft }}
          >
            <AppText variant="display" style={{ textAlign: "center", color: c.primary }}>
              {card.back}
            </AppText>
          </View>
        )}
        <Button
          label="Hear it again"
          icon={Volume2}
          variant="ghost"
          onPress={() => speak(answerVisible ? [card.front, card.back] : card.front)}
        />
      </Card>

      <View style={{ gap: space.md }}>
        {!answerVisible ? (
          <>
            <Button label="Show answer" icon={Eye} size="lg" onPress={reveal} />
            {view.hintOffered && !hintRequested && (
              <Button label="Show a hint" icon={Lightbulb} variant="secondary" onPress={() => setHintRequested(true)} />
            )}
          </>
        ) : (
          <>
            <AppText variant="overline" muted style={{ textAlign: "center" }}>
              How did it go?
            </AppText>
            {OUTCOMES.map((o) => (
              <Button
                key={o.value}
                label={o.label}
                icon={o.icon}
                size={o.value === "correct" ? "lg" : "md"}
                variant={o.value === "correct" ? "primary" : "secondary"}
                disabled={saving}
                onPress={() => mark(o.value)}
              />
            ))}
          </>
        )}
      </View>
    </Screen>
  );
}
