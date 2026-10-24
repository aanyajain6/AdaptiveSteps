// Parent Mode gate. A 4-digit PIN keeps curious kids out of the
// settings; it is NOT authentication and isn't meant to be.

import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppText, Screen } from "../components/ui";
import * as db from "../lib/db";
import { useApp } from "../state/AppProvider";

const PIN_LENGTH = 4;
const MAX_TRIES = 5;
const LOCKOUT_MS = 30_000;

type Mode = "loading" | "enter" | "create" | "confirm";

export default function PinScreen() {
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
    router.replace("/parent");
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
        setMessage("Those didn't match. Let's start again.");
      }
    } else if (mode === "enter") {
      if (pin === savedPin) {
        enterParentMode();
      } else {
        const next = tries + 1;
        if (next >= MAX_TRIES) {
          setLocked(true);
          setTries(0);
          setMessage("Too many tries. Please wait 30 seconds.");
        } else {
          setTries(next);
          setMessage("That PIN isn't right.");
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
    mode === "create"
      ? "Create a 4-digit parent PIN"
      : mode === "confirm"
        ? "Enter the same PIN again"
        : "Enter parent PIN";

  if (mode === "loading") return <Screen>{null}</Screen>;

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
  const c = theme.colors;

  return (
    <Screen style={{ alignItems: "center", justifyContent: "center" }}>
      <AppText variant="heading" style={{ textAlign: "center" }}>
        {prompt}
      </AppText>
      {mode === "create" && (
        <AppText muted variant="caption" style={{ textAlign: "center" }}>
          This keeps settings and progress reports in grown-up hands.
        </AppText>
      )}

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
              { borderColor: c.text, backgroundColor: i < entry.length ? c.text : "transparent" },
            ]}
          />
        ))}
      </View>

      <AppText
        accessibilityLiveRegion="polite"
        style={{ color: c.danger, minHeight: theme.font(24), textAlign: "center" }}
      >
        {message}
      </AppText>

      <View style={styles.pad}>
        {keys.map((k, i) =>
          k === "" ? (
            <View key={i} style={styles.key} />
          ) : (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={k === "⌫" ? "Delete" : k}
              onPress={() => (k === "⌫" ? setEntry((e) => e.slice(0, -1)) : press(k))}
              style={({ pressed }) => [
                styles.key,
                {
                  backgroundColor: pressed ? c.primarySoft : c.surface,
                  borderColor: c.border,
                  borderWidth: theme.borderWidth,
                },
              ]}
            >
              <Text style={{ fontSize: theme.font(26), color: c.text, fontWeight: "600" }}>{k}</Text>
            </Pressable>
          )
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: "row", gap: 18, marginVertical: 12 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  pad: { flexDirection: "row", flexWrap: "wrap", width: 288, gap: 12, justifyContent: "center" },
  key: { width: 84, height: 72, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
