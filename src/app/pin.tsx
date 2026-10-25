// Parent Mode gate. A 4-digit PIN keeps curious kids out of the
// settings; it is NOT authentication and isn't meant to be.

import { Href, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Delete, LockKeyhole } from "lucide-react-native";
import { AppText, Icon, IconTile, Screen } from "../components/ui";
import { radius, space } from "../theme/theme";
import * as db from "../lib/db";
import { useApp } from "../state/AppProvider";

const PIN_LENGTH = 4;
const MAX_TRIES = 5;
const LOCKOUT_MS = 30_000;

type Mode = "loading" | "enter" | "create" | "confirm";

export default function PinScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { unlockParent, theme } = useApp();
  const [mode, setMode] = useState<Mode>("loading");
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [entry, setEntry] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [message, setMessage] = useState("");
  const [tries, setTries] = useState(0);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    db.getParentPin().then((pin) => {
      setSavedPin(pin);
      setMode(pin ? "enter" : "create");
    });
  }, []);

  useEffect(() => {
    if (!locked) return;
    const timer = setTimeout(() => {
      setLocked(false);
      setMessage("");
    }, LOCKOUT_MS);
    return () => clearTimeout(timer);
  }, [locked]);

  function enterParentMode() {
    unlockParent();
    // Only Parent Mode routes are valid destinations.
    router.replace((next?.startsWith("/parent") ? next : "/parent") as Href);
  }

  async function handleComplete(pin: string) {
    setEntry("");
    if (mode === "create") {
      setFirstPin(pin);
      setMode("confirm");
      setMessage("");
    } else if (mode === "confirm") {
      if (pin === firstPin) {
        await db.setParentPin(pin);
        enterParentMode();
      } else {
        setMode("create");
        setMessage("Those PINs didn't match. Try again.");
      }
    } else if (mode === "enter") {
      if (pin === savedPin) {
        enterParentMode();
      } else {
        const next = tries + 1;
        if (next >= MAX_TRIES) {
          setLocked(true);
          setTries(0);
          setMessage("Too many tries. Try again in 30 seconds.");
        } else {
          setTries(next);
          setMessage("Incorrect PIN.");
        }
      }
    }
  }

  function press(digit: string) {
    if (locked) return;
    setMessage("");
    const next = entry + digit;
    if (next.length === PIN_LENGTH) handleComplete(next);
    else setEntry(next);
  }

  const prompt =
    mode === "create" ? "Create a parent PIN" : mode === "confirm" ? "Confirm your PIN" : "Enter parent PIN";
  const subtitle =
    mode === "create"
      ? "Four digits. Keeps settings and progress reports with grown-ups."
      : mode === "confirm"
        ? "Enter the same four digits again."
        : "Parent Mode is for parents and teachers.";

  if (mode === "loading") return <Screen>{null}</Screen>;

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  const c = theme.colors;

  return (
    <Screen style={{ alignItems: "center", justifyContent: "center", gap: space.xl }}>
      <View style={{ alignItems: "center", gap: space.md }}>
        <IconTile icon={LockKeyhole} size={52} />
        <View style={{ alignItems: "center", gap: space.xs }}>
          <AppText variant="title" style={{ textAlign: "center" }}>
            {prompt}
          </AppText>
          <AppText muted variant="caption" style={{ textAlign: "center" }}>
            {subtitle}
          </AppText>
        </View>
      </View>

      <View style={{ alignItems: "center", gap: space.sm }}>
        <View
          style={styles.dots}
          accessible
          accessibilityLabel={`${entry.length} of ${PIN_LENGTH} digits entered`}
        >
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  borderColor: i < entry.length ? c.primary : c.borderStrong,
                  backgroundColor: i < entry.length ? c.primary : "transparent",
                },
              ]}
            />
          ))}
        </View>
        <AppText
          accessibilityLiveRegion="polite"
          variant="caption"
          style={{ color: c.danger, minHeight: theme.font(18), textAlign: "center" }}
        >
          {message}
        </AppText>
      </View>

      <View style={styles.pad}>
        {keys.map((k, i) =>
          k === "" ? (
            <View key={i} style={styles.key} />
          ) : (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={k === "del" ? "Delete" : k}
              onPress={() => (k === "del" ? setEntry((e) => e.slice(0, -1)) : press(k))}
              style={({ pressed }) => [
                styles.key,
                k === "del"
                  ? { backgroundColor: pressed ? c.surfaceSunken : "transparent" }
                  : [{ backgroundColor: pressed ? c.surfaceSunken : c.surface }, theme.elevation.card],
              ]}
            >
              {k === "del" ? (
                <Icon icon={Delete} size={24} color={c.textMuted} />
              ) : (
                <Text style={[theme.type("title"), { fontSize: theme.font(24), color: c.text, letterSpacing: 0 }]}>{k}</Text>
              )}
            </Pressable>
          )
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: "row", gap: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  pad: { flexDirection: "row", flexWrap: "wrap", width: 276, gap: 12, justifyContent: "center" },
  key: { width: 84, height: 64, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
});
