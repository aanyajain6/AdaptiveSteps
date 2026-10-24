// ============================================================
// Review session (Child Mode)
// ============================================================
// Pulls only cards that are due, a few at a time. The child answers
// in their head, reveals, then says how it went in kind words --
// "Not yet" rather than "Wrong". No score is shown.

import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { AppText, Button, Card, Screen } from "../components/ui";
import { recordReview } from "../lib/adaptation";
import * as db from "../lib/db";
import { presentCard } from "../lib/presentation";
import { speak, stopSpeaking } from "../lib/speech";
import { nowIso } from "../lib/time";
import { useApp } from "../state/AppProvider";
import { CardOutcome, ReviewCard } from "../types/models";

// Short sessions: retrieval practice works in small doses, and it's
// better to stop while it still feels good.
const MAX_CARDS_PER_SESSION = 10;

const OUTCOMES: { value: CardOutcome; label: string; icon: string }[] = [
  { value: "correct", label: "I knew it!", icon: "✅" },
  { value: "needed_support", label: "I needed a hint", icon: "💡" },
  { value: "incorrect", label: "Not yet", icon: "🌱" },
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
    return (
      <Screen style={{ justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 88 }}>🌟</Text>
        <AppText variant="title" style={{ textAlign: "center" }}>
          {practiced > 0 ? `You practiced ${practiced} ${practiced === 1 ? "card" : "cards"}!` : "All caught up!"}
        </AppText>
        <AppText muted style={{ textAlign: "center" }}>
          {practiced > 0 ? "Great practicing." : "No cards to practice right now. Check back later."}
        </AppText>
        <Button label="Back home" big onPress={() => router.dismissTo("/")} style={{ alignSelf: "stretch" }} />
      </Screen>
    );
  }

  if (!card || !view) return null;
  const answerVisible = revealed || view.answerShownWithPrompt;
  const hintVisible = !answerVisible && (view.hintShown || hintRequested);

  return (
    <Screen>
      <AppText variant="caption" muted accessibilityLabel={`Card ${index + 1} of ${cards.length}`}>
        Card {index + 1} of {cards.length}
      </AppText>

      <Card style={{ alignItems: "center", gap: 16, paddingVertical: 28 }}>
        {card.subject ? (
          <AppText variant="caption" muted>
            {card.subject}
          </AppText>
        ) : null}
        {card.frontPhotoUri && (
          <Image
            source={{ uri: card.frontPhotoUri }}
            accessibilityLabel={card.front ? `Picture for: ${card.front}` : "Question picture"}
            contentFit="contain"
            style={{ width: "80%", aspectRatio: 4 / 3, borderRadius: theme.radius }}
          />
        )}
        {card.front ? (
          <AppText variant="title" style={{ textAlign: "center" }}>
            {card.front}
          </AppText>
        ) : null}

        {hintVisible && (
          <AppText style={{ fontSize: theme.font(22) }} accessibilityLabel={`Hint: starts with ${view.hint[0]}`}>
            💡 {view.hint}
          </AppText>
        )}

        {answerVisible && (
          <View
            accessibilityLiveRegion="polite"
            style={{
              alignSelf: "stretch",
              padding: 16,
              borderRadius: theme.radius,
              backgroundColor: theme.colors.primarySoft,
            }}
          >
            <AppText variant="title" style={{ textAlign: "center" }}>
              {card.back}
            </AppText>
          </View>
        )}
        <Button
          label="Hear it again"
          icon="🔊"
          variant="quiet"
          onPress={() => speak(answerVisible ? [card.front, card.back] : card.front)}
        />
      </Card>

      {!answerVisible ? (
        <>
          <Button label="Show answer" big onPress={reveal} />
          {view.hintOffered && !hintRequested && (
            <Button label="Show a hint" icon="💡" variant="secondary" onPress={() => setHintRequested(true)} />
          )}
        </>
      ) : (
        OUTCOMES.map((o) => (
          <Button
            key={o.value}
            label={o.label}
            icon={o.icon}
            variant={o.value === "correct" ? "primary" : "secondary"}
            disabled={saving}
            onPress={() => mark(o.value)}
          />
        ))
      )}
    </Screen>
  );
}
