import { router, useFocusEffect } from "expo-router";
import { Layers, Plus } from "lucide-react-native";
import { useCallback, useState } from "react";
import { AppText, Button, ListGroup, ListRow, Screen, Section } from "../../../components/ui";
import * as db from "../../../lib/db";
import { CARD_TIER_LABELS } from "../../../lib/tiers";
import { nowIso } from "../../../lib/time";
import { useApp } from "../../../state/AppProvider";
import { ReviewCard } from "../../../types/models";

function dueLabel(dueAt: string, now: string): string {
  if (dueAt <= now) return "Due now";
  const days = Math.ceil((Date.parse(dueAt) - Date.parse(now)) / (24 * 60 * 60 * 1000));
  return days === 1 ? "Tomorrow" : `In ${days} days`;
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
        Each card returns on its own schedule: sooner when it was tricky, later when it was easy.
      </AppText>

      {cards.length > 0 && (
        <Section title={`${activeChild.name}'s cards`}>
          <ListGroup>
            {cards.map((card) => (
              <ListRow
                key={card.id}
                icon={Layers}
                title={card.front || "Photo card"}
                subtitle={`${card.subject ? `${card.subject} · ` : ""}${CARD_TIER_LABELS[card.supportTier]}`}
                trailing={dueLabel(card.dueAt, now)}
                accessibilityHint="Edit this card"
                onPress={() => router.push({ pathname: "/parent/cards/[id]", params: { id: card.id } })}
              />
            ))}
          </ListGroup>
        </Section>
      )}

      <Button
        label="New card"
        icon={Plus}
        onPress={() => router.push({ pathname: "/parent/cards/[id]", params: { id: "new" } })}
      />
    </Screen>
  );
}
