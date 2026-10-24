// Accessibility settings for the child Child Mode is set up for.
// Same UDL fields as the profile editor (shared component), surfaced
// on their own so they're quick to adjust. Saving re-themes the
// whole app immediately via AppProvider.

import { router } from "expo-router";
import { useState } from "react";
import { PresentationFields, PresentationValues } from "../../components/PresentationFields";
import { AppText, Button, Card, Screen } from "../../components/ui";
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
      <AppText muted>
        How AdaptiveSteps looks for {activeChild.name}. This changes presentation only — it never
        changes how much support the app gives.
      </AppText>
      <Card>
        <PresentationFields value={values} onChange={setValues} />
      </Card>
      <Button label="Save" onPress={save} />
    </Screen>
  );
}
