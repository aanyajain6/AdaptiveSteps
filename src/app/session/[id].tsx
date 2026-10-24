// ============================================================
// Study Session Runner (Child Mode) -- the core experience
// ============================================================
// One step at a time, read aloud. Deliberate choices:
//  - Progress is "step 2 of 5", never a countdown: timers create
//    pressure, and pressure is what we're trying to remove.
//  - "Need help" and "Take a break" are always available and never
//    recorded as failure. Help raises support on the spot; a break
//    pauses the clock and is ignored by the adaptive engine.
//  - Support tiers only change *between* runs, so the screen never
//    shifts under a child mid-session.

import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Celebration, CELEBRATION_MS } from "../../components/Celebration";
import { MoodCheckIn } from "../../components/MoodCheckIn";
import { AppText, Button, Card, Screen } from "../../components/ui";
import { adaptStep } from "../../lib/adaptation";
import * as db from "../../lib/db";
import { boostedTier, presentStep } from "../../lib/presentation";
import { speak, stopSpeaking } from "../../lib/speech";
import { nowIso, nowMs } from "../../lib/time";
import { useApp } from "../../state/AppProvider";
import { ChoiceResponse, Mood, SessionAttempt, StudySession } from "../../types/models";

type Phase = "loading" | "missing" | "moodBefore" | "step" | "celebrate" | "break" | "moodAfter" | "finished";
type StepLog = SessionAttempt["stepLogs"][number];

const CHOICES: { value: ChoiceResponse; emoji: string; label: string; reply?: string }[] = [
  { value: "yes", emoji: "👍", label: "Yes", reply: "Okay!" },
  { value: "no", emoji: "👎", label: "No", reply: "That's okay. You can ask for help or take a break." },
  { value: "more_time", emoji: "⏳", label: "More time", reply: "Take all the time you need." },
  { value: "help", emoji: "🙋", label: "Help" },
];

export default function SessionRunner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeChild, theme } = useApp();
  const c = theme.colors;

  const [session, setSession] = useState<StudySession | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [index, setIndex] = useState(0);
  const [helpRequests, setHelpRequests] = useState(0);
  const [choices, setChoices] = useState<ChoiceResponse[]>([]);
  const [ack, setAck] = useState("");

  // The attempt is saved after every step, so stopping halfway still
  // leaves an accurate record.
  const attempt = useRef<SessionAttempt | null>(null);
  const stepStartedAt = useRef(0);
  const activeMsBeforeBreak = useRef(0);
  const finishingStep = useRef(false); // ignores a double-tap on Done

  useEffect(() => {
    db.getSession(id).then((s) => {
      if (!s || s.steps.length === 0) return setPhase("missing");
      setSession(s);
      setPhase("moodBefore");
    });
    return stopSpeaking;
  }, [id]);

  const step = session?.steps[index];
  const tier = step ? boostedTier(step.supportTier, helpRequests) : 0;
  const view = step && activeChild ? presentStep(step, tier, activeChild.preferredFormat) : null;

  // Read the step aloud on arrival, after a break, and again after each help request.
  const narrationText = view && phase === "step" ? view.narration.join("\n") : "";
  useEffect(() => {
    if (narrationText) speak(narrationText.split("\n"));
  }, [narrationText, helpRequests, index]);

  function beginStep(i: number) {
    setIndex(i);
    setHelpRequests(0);
    setChoices([]);
    setAck("");
    activeMsBeforeBreak.current = 0;
    stepStartedAt.current = nowMs();
    setPhase("step");
  }

  async function saveAttempt(patch: Partial<SessionAttempt>, log?: StepLog) {
    if (!attempt.current) return;
    attempt.current = {
      ...attempt.current,
      ...patch,
      stepLogs: log ? [...attempt.current.stepLogs, log] : attempt.current.stepLogs,
    };
    await db.saveSessionAttempt(attempt.current);
  }

  function makeLog(outcome: StepLog["outcome"]): StepLog {
    return {
      stepId: step!.id,
      outcome,
      msElapsed: activeMsBeforeBreak.current + (nowMs() - stepStartedAt.current),
      supportTierAtAttempt: step!.supportTier,
      timestamp: nowIso(),
      helpRequests,
      choices,
    };
  }

  async function startSession(moodBefore: Mood | undefined) {
    if (!session || !activeChild) return;
    attempt.current = {
      id: db.newId(),
      sessionId: session.id,
      childId: activeChild.id,
      startedAt: nowIso(),
      moodBefore,
      stepLogs: [],
    };
    await db.saveSessionAttempt(attempt.current);
    beginStep(0);
  }

  async function done() {
    if (!session || !step || finishingStep.current) return;
    finishingStep.current = true;
    stopSpeaking();
    // Needing help along the way is information for the engine, not a mark against the child.
    const log = makeLog(helpRequests > 0 ? "need_help" : "done");
    await saveAttempt({}, log);
    await adaptStep(session.id, step.id, log.timestamp);

    const isLast = index === session.steps.length - 1;
    setPhase("celebrate");
    setTimeout(() => {
      finishingStep.current = false;
      if (isLast) setPhase("moodAfter");
      else beginStep(index + 1);
    }, CELEBRATION_MS);
  }

  function needHelp() {
    setHelpRequests((n) => n + 1);
    setAck(tier >= 3 ? "Let's hear it again." : "Here's some more help.");
  }

  async function takeBreak() {
    stopSpeaking();
    const log = makeLog("break");
    activeMsBeforeBreak.current = log.msElapsed;
    await saveAttempt({}, log);
    setPhase("break");
  }

  function endBreak() {
    stepStartedAt.current = nowMs();
    setAck("");
    setPhase("step");
  }

  function choose(choice: (typeof CHOICES)[number]) {
    setChoices((all) => [...all, choice.value]);
    if (choice.value === "help") return needHelp();
    setAck(choice.reply!);
    speak(choice.reply!);
  }

  async function finish(moodAfter: Mood | undefined) {
    await saveAttempt({ moodAfter, completedAt: nowIso() });
    setPhase("finished");
    speak("You did it! All done.");
  }

  const title = session?.title ?? "Study session";

  if (phase === "loading") return <Screen>{null}</Screen>;

  if (phase === "missing") {
    return (
      <Screen>
        <AppText>{"This session isn't available any more."}</AppText>
        <Button label="Go back" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (phase === "moodBefore" || phase === "moodAfter") {
    return (
      <Screen style={{ justifyContent: "center" }}>
        <Stack.Screen options={{ title }} />
        <MoodCheckIn
          prompt={phase === "moodBefore" ? "How are you feeling?" : "How do you feel now?"}
          onPick={phase === "moodBefore" ? startSession : finish}
        />
      </Screen>
    );
  }

  if (phase === "finished") {
    return (
      <Screen style={{ justifyContent: "center", alignItems: "center" }}>
        <Stack.Screen options={{ title }} />
        <Text style={{ fontSize: 88 }}>🎉</Text>
        <AppText variant="title" style={{ textAlign: "center" }}>
          You did it! All done.
        </AppText>
        <Button label="Back home" big onPress={() => router.dismissTo("/")} style={{ alignSelf: "stretch" }} />
      </Screen>
    );
  }

  if (phase === "break") {
    return (
      <Screen style={{ justifyContent: "center", alignItems: "center" }}>
        <Stack.Screen options={{ title }} />
        <Text style={{ fontSize: 88 }}>🌿</Text>
        <AppText variant="title" style={{ textAlign: "center" }}>
          Break time
        </AppText>
        <AppText muted style={{ textAlign: "center" }}>
          Take your time. Stretch, get some water, take a few slow breaths.
        </AppText>
        <Button label="I'm ready" big onPress={endBreak} style={{ alignSelf: "stretch" }} />
      </Screen>
    );
  }

  if (!session || !step || !view) return null;
  const total = session.steps.length;

  return (
    <Screen>
      <Stack.Screen options={{ title }} />

      {/* Progress strip -- position only, no clock. */}
      <View
        accessible
        accessibilityLabel={`Step ${index + 1} of ${total}`}
        style={{ gap: 8 }}
      >
        <AppText variant="caption" muted>
          Step {index + 1} of {total}
        </AppText>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {session.steps.map((s, i) => (
            <View
              key={s.id}
              style={{
                flex: 1,
                height: 10,
                borderRadius: 5,
                backgroundColor:
                  i < index || (i === index && phase === "celebrate")
                    ? c.success
                    : i === index
                      ? c.primary
                      : c.border,
              }}
            />
          ))}
        </View>
      </View>

      {phase === "celebrate" ? (
        <Celebration />
      ) : (
        <>
          <Card style={{ gap: 14 }}>
            <AppText variant="title">{step.label}</AppText>
            {view.showHint && (
              <View style={{ backgroundColor: c.primarySoft, borderRadius: theme.radius, padding: 12 }}>
                <AppText>💡 {step.hint}</AppText>
              </View>
            )}
            {view.photo !== "none" && step.photoUri && (
              <Image
                source={{ uri: step.photoUri }}
                accessibilityLabel={`Picture for: ${step.label}`}
                contentFit="contain"
                style={{
                  width: view.photo === "large" ? "100%" : "50%",
                  aspectRatio: 4 / 3,
                  borderRadius: theme.radius,
                  alignSelf: "center",
                }}
              />
            )}
            <Button label="Hear it again" icon="🔊" variant="quiet" onPress={() => speak(view.narration)} />
          </Card>

          {ack ? (
            <AppText accessibilityLiveRegion="polite" style={{ textAlign: "center" }}>
              {ack}
            </AppText>
          ) : null}

          <Button label="Done" icon="✅" big onPress={done} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button label="I need help" icon="🙋" variant="secondary" onPress={needHelp} style={{ flex: 1 }} />
            <Button label="Take a break" icon="🌿" variant="secondary" onPress={takeBreak} style={{ flex: 1 }} />
          </View>

          {/* Choice board for kids who'd rather point than talk. */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {CHOICES.map((ch) => (
              <Pressable
                key={ch.value}
                accessibilityRole="button"
                accessibilityLabel={`Choice: ${ch.label}`}
                onPress={() => choose(ch)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 72,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: theme.radius,
                  borderWidth: theme.borderWidth,
                  borderColor: c.border,
                  backgroundColor: pressed ? c.primarySoft : c.surface,
                })}
              >
                <Text style={{ fontSize: 28 }}>{ch.emoji}</Text>
                <AppText variant="caption">{ch.label}</AppText>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
