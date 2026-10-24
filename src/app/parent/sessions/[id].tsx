// Session builder. Steps keep their ids across edits so a step's
// history (and its support tier) survives renaming or reordering.

import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { PhotoField } from "../../../components/PhotoField";
import { AppText, Button, Card, Field, Screen } from "../../../components/ui";
import { confirm } from "../../../lib/confirm";
import * as db from "../../../lib/db";
import { deletePhoto } from "../../../lib/photos";
import { DEFAULT_STEP_TIER, TIER_LABELS } from "../../../lib/tiers";
import { useApp } from "../../../state/AppProvider";
import { SessionStep, StudySession } from "../../../types/models";

function blankStep(): SessionStep {
  return { id: db.newId(), label: "", supportTier: DEFAULT_STEP_TIER };
}

export default function EditSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const { activeChild, theme } = useApp();

  const [existing, setExisting] = useState<StudySession | null>(null);
  const [loaded, setLoaded] = useState(isNew);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [steps, setSteps] = useState<SessionStep[]>(() => [blankStep()]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew) return;
    db.getSession(id).then((s) => {
      if (s) {
        setExisting(s);
        setTitle(s.title);
        setSubject(s.subject);
        setSteps(s.steps.length ? s.steps : [blankStep()]);
      }
      setLoaded(true);
    });
  }, [id, isNew]);

  function updateStep(stepId: string, patch: Partial<SessionStep>) {
    setSteps((all) => all.map((s) => (s.id === stepId ? { ...s, ...patch } : s)));
    setError("");
  }

  function moveStep(index: number, delta: -1 | 1) {
    setSteps((all) => {
      const next = [...all];
      const [step] = next.splice(index, 1);
      next.splice(index + delta, 0, step);
      return next;
    });
  }

  async function save() {
    if (!activeChild) return;
    const cleaned = steps
      .map((s) => ({
        ...s,
        label: s.label.trim(),
        hint: s.hint?.trim() || undefined,
        subjectTag: s.subjectTag?.trim() || undefined,
      }))
      .filter((s) => s.label);
    if (!title.trim()) return setError("Please give the session a title.");
    if (cleaned.length === 0) return setError("Add at least one step with a label.");

    const session: StudySession = {
      id: existing?.id ?? db.newId(),
      childId: existing?.childId ?? activeChild.id,
      title: title.trim(),
      subject: subject.trim(),
      steps: cleaned,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    await db.saveSession(session);

    // Clean up photos that were replaced or removed.
    const kept = new Set(cleaned.map((s) => s.photoUri));
    existing?.steps.forEach((s) => !kept.has(s.photoUri) && deletePhoto(s.photoUri));
    router.back();
  }

  async function remove() {
    if (!existing) return;
    const ok = await confirm(
      `Delete "${existing.title}"?`,
      "The session will be removed. Past progress on it stays in the dashboard history.",
      "Delete"
    );
    if (!ok) return;
    await db.deleteSession(existing.id);
    existing.steps.forEach((s) => deletePhoto(s.photoUri));
    router.back();
  }

  if (!loaded) return <Screen>{null}</Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? "New session" : "Edit session" }} />

      <Card>
        <Field label="Title" value={title} onChangeText={(t) => { setTitle(t); setError(""); }} placeholder="e.g. Fractions worksheet" maxLength={80} />
        <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="e.g. Math" maxLength={40} />
      </Card>

      <AppText variant="heading">Steps</AppText>
      <AppText variant="caption" muted>
        Your child sees one step at a time. Keep each one small and concrete.
      </AppText>

      {steps.map((step, i) => (
        <Card key={step.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <AppText variant="heading">Step {i + 1}</AppText>
            <AppText variant="caption" muted>
              Support: {TIER_LABELS[step.supportTier]}
            </AppText>
          </View>
          <Field
            label={`Step ${i + 1} label`}
            value={step.label}
            onChangeText={(label) => updateStep(step.id, { label })}
            placeholder="e.g. Get out your worksheet"
            maxLength={120}
          />
          <Field
            label={`Step ${i + 1} reminder (optional)`}
            value={step.hint ?? ""}
            onChangeText={(hint) => updateStep(step.id, { hint })}
            placeholder="e.g. It's the blue folder in your backpack"
            maxLength={200}
            multiline
          />
          <Field
            label={`Step ${i + 1} subject tag (optional)`}
            value={step.subjectTag ?? ""}
            onChangeText={(subjectTag) => updateStep(step.id, { subjectTag })}
            placeholder="e.g. Reading"
            maxLength={40}
          />
          <PhotoField
            label={`Step ${i + 1} photo (optional)`}
            uri={step.photoUri}
            onChange={(photoUri) => updateStep(step.id, { photoUri })}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Move up" variant="secondary" disabled={i === 0} onPress={() => moveStep(i, -1)} style={{ flex: 1 }} />
            <Button label="Move down" variant="secondary" disabled={i === steps.length - 1} onPress={() => moveStep(i, 1)} style={{ flex: 1 }} />
          </View>
          <Button
            label={`Remove step ${i + 1}`}
            variant="quiet"
            disabled={steps.length === 1}
            onPress={() => setSteps((all) => all.filter((s) => s.id !== step.id))}
          />
        </Card>
      ))}

      <Button label="Add step" icon="＋" variant="secondary" onPress={() => setSteps((all) => [...all, blankStep()])} />

      {error ? (
        <AppText accessibilityLiveRegion="polite" style={{ color: theme.colors.danger }}>
          {error}
        </AppText>
      ) : null}
      <Button label={isNew ? "Create session" : "Save session"} onPress={save} />
      {existing && <Button label="Delete session" variant="quiet" onPress={remove} />}
    </Screen>
  );
}
