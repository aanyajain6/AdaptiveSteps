import { Image } from "expo-image";
import { useState } from "react";
import { View } from "react-native";
import { pickPhoto } from "../lib/photos";
import { AppText, Button } from "./ui";
import { useAppTheme } from "../state/AppProvider";

/** Add / replace / remove a photo. `onChange(undefined)` means removed. */
export function PhotoField({
  label,
  uri,
  onChange,
}: {
  label: string;
  uri?: string;
  onChange: (uri: string | undefined) => void;
}) {
  const theme = useAppTheme();
  const [busy, setBusy] = useState(false);

  async function choose(source: "library" | "camera") {
    setBusy(true);
    try {
      const picked = await pickPhoto(source);
      if (picked) onChange(picked);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      {uri ? (
        <Image
          source={{ uri }}
          accessibilityLabel={`${label} preview`}
          style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: theme.radius }}
          contentFit="cover"
        />
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Button label={uri ? "Change photo" : "Choose photo"} icon="🖼" variant="secondary" disabled={busy} onPress={() => choose("library")} style={{ flexGrow: 1 }} />
        <Button label="Camera" icon="📷" variant="secondary" disabled={busy} onPress={() => choose("camera")} style={{ flexGrow: 1 }} />
        {uri ? <Button label="Remove photo" variant="quiet" onPress={() => onChange(undefined)} /> : null}
      </View>
    </View>
  );
}
