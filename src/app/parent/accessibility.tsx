// Accessibility settings for the child Child Mode is set up for.
// Same UDL fields as the profile editor (shared component), surfaced
// on their own so they're quick to adjust. Saving re-themes the
// whole app immediately via AppProvider.

import { router, Stack } from "expo-router";
import { Check, Eye } from "lucide-react-native";
import { useState } from "react";
import { PresentationFields, PresentationValues } from "../../components/PresentationFields";
import { FormSection, PageHeader } from "../../components/structure";
import { AppText, Button, Screen } from "../../components/ui";
import * as db from "../../lib/db";
import { useApp } from "../../state/AppProvider";

export default function AccessibilitySettings() {
  const { activeChild, refreshActiveChild } = useApp();
  const [values, setValues] = useState<PresentationValues | null>(
    activeChild
      ? {
          textScale: activeChild.textScale,
          highContrast: activeChild.highContrast,
          reduceAnimations: activeChild.reduceAnimations,
        }
      : null
  );

  if (!activeChild || !values) {
    return (
      <Screen>
        <AppText muted>Create a child profile first.</AppText>
      </Screen>
    );
  }

  async function save() {
    await db.saveChild({ ...activeChild!, ...values! });
    await refreshActiveChild();
    router.back();
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "" }} />
      <PageHeader
        icon={Eye}
        title="Accessibility"
        meta={`How AdaptiveSteps looks for ${activeChild.name}. Presentation only: it never changes how much support the app gives.`}
      />
      <FormSection title="Display">
        <PresentationFields value={values} onChange={setValues} />
      </FormSection>
      <Button label="Save" icon={Check} size="lg" onPress={save} />
    </Screen>
  );
}
