import { router, Stack, useFocusEffect } from "expo-router";
import { Layers, Plus } from "lucide-react-native";
import { useCallback, useState } from "react";
import { PageHeader, StatusList, StatusRow } from "../../../components/structure";
import { EmptyState } from "../../../components/EmptyState";
import { AppText, Button, Screen } from "../../../components/ui";
import * as db from "../../../lib/db";
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

  const header = <Stack.Screen options={{ title: "" }} />;

  if (!activeChild) {
    return (
      <Screen>
        {header}
        <AppText muted>Create a child profile first, then add review cards for them here.</AppText>
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      <PageHeader
        icon={Layers}
        title="Review cards"
        meta={`${activeChild.name} · Each card returns sooner when it was tricky, later when it was easy.`}
      />

      <Button
        label="New card"
        icon={Plus}
        size="lg"
        onPress={() => router.push({ pathname: "/parent/cards/[id]", params: { id: "new" } })}
      />

      {cards.length > 0 ? (
        <StatusList>
          {cards.map((card) => (
            <StatusRow
              key={card.id}
              icon={Layers}
              title={card.front || "Photo card"}
              meta={[card.subject, dueLabel(card.dueAt, now)].filter(Boolean).join(" · ")}
              status={card.supportTier > 0 ? "extra_support" : undefined}
              accessibilityHint="Edit this card"
              onPress={() => router.push({ pathname: "/parent/cards/[id]", params: { id: card.id } })}
            />
          ))}
        </StatusList>
      ) : (
        <EmptyState size={120} title="No cards yet" body="Add a few facts or words to practice. New cards are ready right away." />
      )}
    </Screen>
  );
}
