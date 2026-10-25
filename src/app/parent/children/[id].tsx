// Create/edit a child profile. Only presentation preferences here --
// there is intentionally no field for diagnosis, condition, or
// "level". Support is decided per step from how the child does.

import { router, Stack, useLocalSearchParams } from "expo-router";
import { AudioLines, Check, Image as ImageIcon, Trash2, Type, UserRound, UserRoundCheck } from "lucide-react-native";
import { View } from "react-native";
import { FormSection, PageHeader } from "../../../components/structure";
import { useEffect, useState } from "react";
import { AppText, Button, Field, OptionGroup, Screen } from "../../../components/ui";
import { space } from "../../../theme/theme";
import { PresentationFields, PresentationValues } from "../../../components/PresentationFields";
import { confirm } from "../../../lib/confirm";
import * as db from "../../../lib/db";
import { useApp } from "../../../state/AppProvider";
import { ChildProfile, PreferredFormat } from "../../../types/models";

type AgeBand = ChildProfile["ageBand"];

const AGE_BANDS: { value: AgeBand; label: string }[] = [
  { value: "4-6", label: "4–6" },
  { value: "7-9", label: "7–9" },
  { value: "10-12", label: "10–12" },
  { value: "13+", label: "13+" },
];

const FORMATS = [
  { value: "picture" as const, label: "Pictures", icon: ImageIcon },
  { value: "text" as const, label: "Text", icon: Type },
  { value: "voice" as const, label: "Voice", icon: AudioLines },
];

const DEFAULT_PRESENTATION: PresentationValues = {
  textScale: 1,
  highContrast: false,
  reduceAnimations: false,
};

export default function EditChild() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const { activeChild, setActiveChild, refreshActiveChild, theme } = useApp();

  const [existing, setExisting] = useState<ChildProfile | null>(null);
  const [loaded, setLoaded] = useState(isNew);
  const [name, setName] = useState("");
  const [ageBand, setAgeBand] = useState<AgeBand>("7-9");
  const [format, setFormat] = useState<PreferredFormat>("picture");
  const [presentation, setPresentation] = useState(DEFAULT_PRESENTATION);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew) return;
    db.getChild(id).then((child) => {
      if (child) {
        setExisting(child);
        setName(child.name);
        setAgeBand(child.ageBand);
        setFormat(child.preferredFormat);
        setPresentation({
          textScale: child.textScale,
          highContrast: child.highContrast,
          reduceAnimations: child.reduceAnimations,
        });
      }
      setLoaded(true);
    });
  }, [id, isNew]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a name.");
      return;
    }
    const child: ChildProfile = {
      id: existing?.id ?? db.newId(),
      name: trimmed,
      ageBand,
      preferredFormat: format,
      ...presentation,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    await db.saveChild(child);
    if (!activeChild) await setActiveChild(child.id);
    else if (activeChild.id === child.id) await refreshActiveChild();
    router.back();
  }

  async function remove() {
    if (!existing) return;
    const ok = await confirm(
      `Delete ${existing.name}?`,
      "This removes the profile and all of their sessions, review cards, and progress history from this device. It can't be undone.",
      "Delete"
    );
    if (!ok) return;
    await db.deleteChildAndData(existing.id);
    await refreshActiveChild();
    router.back();
  }

  if (!loaded) return <Screen>{null}</Screen>;

  const isActive = existing && existing.id === activeChild?.id;

  return (
    <Screen>
      <Stack.Screen options={{ title: "" }} />
      <PageHeader
        icon={UserRound}
        title={isNew ? "New profile" : `Edit ${existing?.name ?? "profile"}`}
        meta={isNew ? "No diagnosis or labels here, by design. Support adapts to how they actually do." : isActive ? "In Child Mode now" : undefined}
      />

      <FormSection title="About">
        <Field
          label="Name"
          value={name}
          onChangeText={(t) => {
            setName(t);
            setError("");
          }}
          placeholder="First name or nickname"
          autoCapitalize="words"
          maxLength={40}
        />
        {error ? (
          <AppText accessibilityLiveRegion="polite" variant="caption" style={{ color: theme.colors.danger }}>
            {error}
          </AppText>
        ) : null}
        <OptionGroup label="Age" options={AGE_BANDS} value={ageBand} onChange={setAgeBand} />
        <OptionGroup label="Learns best with" options={FORMATS} value={format} onChange={setFormat} />
      </FormSection>

      <FormSection title="Display">
        <PresentationFields value={presentation} onChange={setPresentation} />
      </FormSection>

      <View style={{ gap: space.sm }}>
        <Button label={isNew ? "Create profile" : "Save"} icon={Check} size="lg" onPress={save} />
        {existing && !isActive ? (
          <Button
            label="Use in Child Mode"
            icon={UserRoundCheck}
            variant="outline"
            onPress={async () => {
              await setActiveChild(existing.id);
              router.back();
            }}
          />
        ) : null}
        {existing && <Button label="Delete profile" icon={Trash2} variant="danger" onPress={remove} />}
      </View>
    </Screen>
  );
}
