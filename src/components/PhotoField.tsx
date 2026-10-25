import { Image } from "expo-image";
import { Camera, ImagePlus, X } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { pickPhoto } from "../lib/photos";
import { radius, space } from "../theme/theme";
import { AppText, Button } from "./ui";

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
    <View style={{ gap: space.sm }}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      {uri ? (
        <Image
          source={{ uri }}
          accessibilityLabel={`${label} preview`}
          style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radius.md }}
          contentFit="cover"
        />
      ) : null}
      <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
        <Button label={uri ? "Replace" : "Choose photo"} icon={ImagePlus} variant="secondary" disabled={busy} onPress={() => choose("library")} style={{ flexGrow: 1 }} />
        <Button label="Camera" icon={Camera} variant="secondary" disabled={busy} onPress={() => choose("camera")} style={{ flexGrow: 1 }} />
        {uri ? <Button label="Remove photo" icon={X} variant="ghost" onPress={() => onChange(undefined)} /> : null}
      </View>
    </View>
  );
}
