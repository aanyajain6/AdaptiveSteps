import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { AppText, Button, Card, Screen } from "../../../components/ui";
import * as db from "../../../lib/db";
import { CARD_TIER_LABELS } from "../../../lib/tiers";
import { nowIso } from "../../../lib/time";
import { useApp } from "../../../state/AppProvider";
import { ReviewCard } from "../../../types/models";

function dueLabel(dueAt: string, now: string): string {
  if (dueAt <= now) return "Due now";
  const days = Math.ceil((Date.parse(dueAt) - Date.parse(now)) / (24 * 60 * 60 * 1000));
  return days === 1 ? "Due tomorrow" : `Due in ${days} days`;
}

export default function CardsList() {
  const { activeChild } = useApp();
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [now, setNow] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!activeChild) return;
      db.listReviewCards(activeChild.id).then((all) => {
        setNow(nowIso());
        setCards([...all].sort((a, b) => a.dueAt.localeCompare(b.dueAt)));
      });
    }, [activeChild])
  );

  if (!activeChild) {
    return (
      <Screen>
        <AppText muted>Create a child profile first, then add review cards for them here.</AppText>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText muted>
        Review cards for {activeChild.name}. Each card comes back on its own schedule — sooner when
        it was tricky, later when it was easy.
      </AppText>

      {cards.map((card) => (
        <Card key={card.id}>
          <AppText variant="heading">{card.front || "(photo card)"}</AppText>
          <AppText variant="caption" muted>
            {card.subject ? `${card.subject} · ` : ""}
            {CARD_TIER_LABELS[card.supportTier]} · {dueLabel(card.dueAt, now)}
          </AppText>
          <Button
            label="Edit"
            variant="secondary"
            onPress={() => router.push({ pathname: "/parent/cards/[id]", params: { id: card.id } })}
          />
        </Card>
      ))}

      <Button
        label="New card"
        icon="＋"
        onPress={() => router.push({ pathname: "/parent/cards/[id]", params: { id: "new" } })}
      />
    </Screen>
  );
}
