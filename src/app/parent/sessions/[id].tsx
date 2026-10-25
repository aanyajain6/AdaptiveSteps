// Session builder. Steps are authored on the same numbered rail the
// child will see (variant "authoring": order only, no progress), one
// step expanded for editing at a time. Steps keep their ids across
// edits so a step's history (and its support tier) survives renaming
// or reordering.

import { router, Stack, useLocalSearchParams } from "expo-router";
import { ArrowDown, ArrowUp, Check, ClipboardList, Plus, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { PhotoField } from "../../../components/PhotoField";
import { FormSection, PageHeader, Stepper, StepperItem } from "../../../components/structure";
import { AppText, Button, Field, Screen } from "../../../components/ui";
import { confirm } from "../../../lib/confirm";
import * as db from "../../../lib/db";
import { deletePhoto } from "../../../lib/photos";
import { DEFAULT_STEP_TIER, TIER_LABELS } from "../../../lib/tiers";
import { useApp } from "../../../state/AppProvider";
import { space } from "../../../theme/theme";
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
  /** The one step expanded for editing. */
  const [editingId, setEditingId] = useState<string>(() => steps[0]?.id ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew) return;
    db.getSession(id).then((s) => {
      if (s) {
        setExisting(s);
        setTitle(s.title);
        setSubject(s.subject);
        const loadedSteps = s.steps.length ? s.steps : [blankStep()];
        setSteps(loadedSteps);
        setEditingId(loadedSteps[0].id);
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

  function addStep() {
    const step = blankStep();
    setSteps((all) => [...all, step]);
    setEditingId(step.id);
  }

  function removeStep(index: number) {
    const remaining = steps.filter((_, i) => i !== index);
    setSteps(remaining);
    setEditingId(remaining[Math.min(index, remaining.length - 1)].id);
  }

  if (!loaded) return <Screen>{null}</Screen>;

  const items: StepperItem[] = steps.map((st, i) => ({
    key: st.id,
    number: i + 1,
    title: st.label.trim() || "Untitled step",
    meta: [st.subjectTag, st.hint ? "Reminder" : null, st.photoUri ? "Photo" : null, `Support: ${TIER_LABELS[st.supportTier]}`]
      .filter(Boolean)
      .join(" · "),
  }));

  return (
    <Screen>
      <Stack.Screen options={{ title: "" }} />
      <PageHeader
        icon={ClipboardList}
        title={isNew ? "New session" : "Edit session"}
        meta={`${steps.length} ${steps.length === 1 ? "step" : "steps"} · Shown to ${activeChild?.name ?? "your child"} one at a time and read aloud`}
      />

      <FormSection title="Details">
        <Field label="Title" value={title} onChangeText={(t) => { setTitle(t); setError(""); }} placeholder="e.g. Fractions worksheet" maxLength={80} />
        <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="e.g. Math" maxLength={40} />
      </FormSection>

      <FormSection title="Steps">
        <AppText variant="caption" muted>
          Keep each step small and concrete. Tap a step to edit it.
        </AppText>
        <Stepper
          variant="authoring"
          selectHint="Edit this step"
          items={items}
          currentKey={editingId}
          onSelect={setEditingId}
          renderExpanded={(item) => {
            const i = item.number - 1;
            const step = steps[i];
            return (
              <View style={{ gap: space.md }}>
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
                <View style={{ flexDirection: "row", gap: space.sm }}>
                  <Button label="Move up" icon={ArrowUp} variant="outline" disabled={i === 0} onPress={() => moveStep(i, -1)} style={{ flex: 1 }} />
                  <Button label="Move down" icon={ArrowDown} variant="outline" disabled={i === steps.length - 1} onPress={() => moveStep(i, 1)} style={{ flex: 1 }} />
                </View>
                <Button
                  label={`Remove step ${i + 1}`}
                  icon={Trash2}
                  variant="danger"
                  disabled={steps.length === 1}
                  onPress={() => removeStep(i)}
                  style={{ alignSelf: "flex-start", paddingHorizontal: 0 }}
                />
              </View>
            );
          }}
        />
        <Button label="Add step" icon={Plus} variant="outline" onPress={addStep} />
      </FormSection>

      {error ? (
        <AppText accessibilityLiveRegion="polite" style={{ color: theme.colors.danger }}>
          {error}
        </AppText>
      ) : null}
      <View style={{ gap: space.sm }}>
        <Button label={isNew ? "Create session" : "Save session"} icon={Check} size="lg" onPress={save} />
        {existing && <Button label="Delete session" icon={Trash2} variant="danger" onPress={remove} />}
      </View>
    </Screen>
  );
}
