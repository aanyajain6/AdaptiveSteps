// Create/edit a review card. Editing the content keeps the card's
// schedule and support level; it's the same skill, worded better.

import { router, Stack, useLocalSearchParams } from "expo-router";
import { Check, Layers, Trash2 } from "lucide-react-native";
import { View } from "react-native";
import { FormSection, PageHeader } from "../../../components/structure";
import { useEffect, useState } from "react";
import { PhotoField } from "../../../components/PhotoField";
import { AppText, Button, Field, Screen } from "../../../components/ui";
import { space } from "../../../theme/theme";
import { confirm } from "../../../lib/confirm";
import * as db from "../../../lib/db";
import { deletePhoto } from "../../../lib/photos";
import { CARD_TIER_LABELS, DEFAULT_CARD_TIER } from "../../../lib/tiers";
import { nowIso } from "../../../lib/time";
import { useApp } from "../../../state/AppProvider";
import { ReviewCard } from "../../../types/models";

export default function EditCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const { activeChild, theme } = useApp();

  const [existing, setExisting] = useState<ReviewCard | null>(null);
  const [loaded, setLoaded] = useState(isNew);
  const [subject, setSubject] = useState("");
  const [front, setFront] = useState("");
  const [frontPhotoUri, setFrontPhotoUri] = useState<string | undefined>();
  const [back, setBack] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew || !activeChild) return;
    db.listReviewCards(activeChild.id).then((all) => {
      const card = all.find((c) => c.id === id);
      if (card) {
        setExisting(card);
        setSubject(card.subject);
        setFront(card.front);
        setFrontPhotoUri(card.frontPhotoUri);
        setBack(card.back);
      }
      setLoaded(true);
    });
  }, [id, isNew, activeChild]);

  async function save() {
    if (!activeChild) return;
    if (!front.trim() && !frontPhotoUri) return setError("Add a question or a photo for the front.");
    if (!back.trim()) return setError("Add the answer for the back.");

    const now = nowIso();
    const card: ReviewCard = existing
      ? { ...existing, subject: subject.trim(), front: front.trim(), frontPhotoUri, back: back.trim() }
      : {
          id: db.newId(),
          childId: activeChild.id,
          subject: subject.trim(),
          front: front.trim(),
          back: back.trim(),
          frontPhotoUri,
          supportTier: DEFAULT_CARD_TIER,
          intervalDays: 1,
          dueAt: now, // new cards are ready to practice right away
          correctStreak: 0,
          struggleStreak: 0,
          createdAt: now,
        };
    await db.saveReviewCard(card);
    if (existing?.frontPhotoUri && existing.frontPhotoUri !== frontPhotoUri) deletePhoto(existing.frontPhotoUri);
    router.back();
  }

  async function remove() {
    if (!existing) return;
    const ok = await confirm("Delete this card?", "Its review history stays in the dashboard.", "Delete");
    if (!ok) return;
    await db.deleteReviewCard(existing.id);
    deletePhoto(existing.frontPhotoUri);
    router.back();
  }

  if (!loaded) return <Screen>{null}</Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ title: "" }} />
      <PageHeader
        icon={Layers}
        title={isNew ? "New card" : "Edit card"}
        meta={
          existing
            ? `Current support: ${CARD_TIER_LABELS[existing.supportTier]}. Editing the wording keeps its schedule.`
            : "New cards are ready to practice right away."
        }
      />

      <FormSection title="Front">
        <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="e.g. Math facts" maxLength={40} />
        <Field
          label="Front (question)"
          value={front}
          onChangeText={(t) => { setFront(t); setError(""); }}
          placeholder="e.g. 7 × 8"
          maxLength={200}
          multiline
        />
        <PhotoField label="Front photo (optional)" uri={frontPhotoUri} onChange={(u) => { setFrontPhotoUri(u); setError(""); }} />
      </FormSection>

      <FormSection title="Back">
        <Field
          label="Back (answer)"
          value={back}
          onChangeText={(t) => { setBack(t); setError(""); }}
          placeholder="e.g. 56"
          maxLength={200}
          multiline
        />
      </FormSection>

      {error ? (
        <AppText accessibilityLiveRegion="polite" style={{ color: theme.colors.danger }}>
          {error}
        </AppText>
      ) : null}
      <View style={{ gap: space.sm }}>
        <Button label={isNew ? "Create card" : "Save card"} icon={Check} size="lg" onPress={save} />
        {existing && <Button label="Delete card" icon={Trash2} variant="danger" onPress={remove} />}
      </View>
    </Screen>
  );
}
