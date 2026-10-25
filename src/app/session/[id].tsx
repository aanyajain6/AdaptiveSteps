// ============================================================
// Study Session Runner (Child Mode) -- the core experience
// ============================================================
// A numbered vertical stepper: every step visible as a sequence, the
// current one expanded with its support, read aloud. Deliberate choices:
//  - Progress is "step 2 of 5" and a fill bar, never a countdown:
//    timers create pressure, and pressure is what we're removing.
//  - "Need help" and "Take a break" are always available and never
//    recorded as failure. Help raises support on the spot; a break
//    pauses the clock and is ignored by the adaptive engine.
//  - Any step can be opened by tapping its number. Finishing a step
//    moves to the next unfinished one; the session ends when all are done.
//  - Support tiers only change *between* runs, so the screen never
//    shifts under a child mid-session.

import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Clock,
  Coffee,
  Hand,
  House,
  Lightbulb,
  Play,
  ThumbsDown,
  ThumbsUp,
  Volume2,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { Celebration, CELEBRATION_MS } from "../../components/Celebration";
import { MoodCheckIn } from "../../components/MoodCheckIn";
import { EmptyState } from "../../components/EmptyState";
import { Dropdown, PageHeader, ProgressBar, Stepper, StepperItem } from "../../components/structure";
import { AppText, Button, Icon, Screen } from "../../components/ui";
import { adaptStep } from "../../lib/adaptation";
import * as db from "../../lib/db";
import { boostedTier, nextUnfinished, presentStep, stepStatuses } from "../../lib/presentation";
import { speak, stopSpeaking } from "../../lib/speech";
import { nowIso, nowMs } from "../../lib/time";
import { useApp, useAppTheme } from "../../state/AppProvider";
import { MAX_WIDE_CONTENT_WIDTH, radius, space, TABLET_BREAKPOINT } from "../../theme/theme";
import { ChoiceResponse, Mood, SessionAttempt, StudySession } from "../../types/models";

type Phase = "loading" | "missing" | "moodBefore" | "step" | "celebrate" | "break" | "moodAfter" | "finished";
type StepLog = SessionAttempt["stepLogs"][number];
type ViewMode = "all" | "current";

const CHOICES: { value: ChoiceResponse; icon: LucideIcon; label: string; reply?: string }[] = [
  { value: "yes", icon: ThumbsUp, label: "Yes", reply: "Okay!" },
  { value: "no", icon: ThumbsDown, label: "No", reply: "That's okay. You can ask for help or take a break." },
  { value: "more_time", icon: Clock, label: "More time", reply: "Take all the time you need." },
  { value: "help", icon: Hand, label: "Help" },
];

export default function SessionRunner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeChild } = useApp();
  const { width } = useWindowDimensions();
  const wide = width >= TABLET_BREAKPOINT;

  const [session, setSession] = useState<StudySession | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [index, setIndex] = useState(0);
  const [helpRequests, setHelpRequests] = useState(0);
  const [choices, setChoices] = useState<ChoiceResponse[]>([]);
  const [ack, setAck] = useState("");
  const [logs, setLogs] = useState<StepLog[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("all");

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
  const statuses = session ? stepStatuses(session.steps.map((s) => s.id), logs, index, helpRequests) : [];

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
    setLogs(attempt.current.stepLogs);
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

  function goToNextOrFinish(after: StepLog[]) {
    const next = nextUnfinished(stepStatuses(session!.steps.map((s) => s.id), after, -1, 0), index);
    if (next === null) setPhase("moodAfter");
    else beginStep(next);
  }

  async function done() {
    if (!session || !step || finishingStep.current) return;
    stopSpeaking();
    // Re-opened a step that's already finished this run: just move on, never log it twice.
    if (statuses[index] === "done") return goToNextOrFinish(logs);

    finishingStep.current = true;
    // Needing help along the way is information for the engine, not a mark against the child.
    const log = makeLog(helpRequests > 0 ? "need_help" : "done");
    await saveAttempt({}, log);
    await adaptStep(session.id, step.id, log.timestamp);

    const after = [...logs, log];
    setPhase("celebrate");
    setTimeout(() => {
      finishingStep.current = false;
      goToNextOrFinish(after);
    }, CELEBRATION_MS);
  }

  function jumpTo(key: string) {
    if (!session || phase !== "step") return;
    const i = session.steps.findIndex((s) => s.id === key);
    if (i < 0 || i === index) return;
    stopSpeaking();
    beginStep(i);
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
  const headerOptions = { title: "" };

  if (phase === "loading") return <Screen>{null}</Screen>;

  if (phase === "missing") {
    return (
      <Screen>
        <AppText>{"This session isn't available anymore."}</AppText>
        <Button label="Go back" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (phase === "moodBefore" || phase === "moodAfter") {
    return (
      <Screen style={{ justifyContent: "center" }}>
        <Stack.Screen options={headerOptions} />
        <MoodCheckIn
          prompt={phase === "moodBefore" ? "How are you feeling?" : "How do you feel now?"}
          subtitle={phase === "moodBefore" ? "Pick the face that fits. Any answer is okay." : "You finished every step."}
          onPick={phase === "moodBefore" ? startSession : finish}
        />
      </Screen>
    );
  }

  if (phase === "finished") {
    return (
      <Screen style={{ justifyContent: "center" }}>
        <Stack.Screen options={headerOptions} />
        <EmptyState
          celebrate
          title="All done!"
          body={`You finished ${title}. Hop is proud of you.`}
          action={<Button label="Back home" icon={House} size="lg" onPress={() => router.dismissTo("/")} />}
        />
      </Screen>
    );
  }

  if (phase === "break") {
    return (
      <Screen style={{ justifyContent: "center" }}>
        <Stack.Screen options={headerOptions} />
        <Moment icon={Coffee} title="Break time" body="Take your time. Stretch, get some water, or take a few slow breaths." />
        <Button label="I'm ready" icon={Play} size="lg" onPress={endBreak} />
      </Screen>
    );
  }

  if (!session || !step || !view) return null;

  const total = session.steps.length;
  const doneCount = statuses.filter((s) => s === "done").length;
  const items: StepperItem[] = session.steps.map((s, i) => ({
    key: s.id,
    number: i + 1,
    title: s.label,
    meta: s.subjectTag || undefined,
    status: statuses[i],
  }));
  const visibleItems = viewMode === "current" ? items.filter((it) => it.key === step.id) : items;

  const detail = (
    <StepDetail
      celebrating={phase === "celebrate"}
      showHint={view.showHint}
      hint={step.hint}
      photo={view.photo}
      photoUri={step.photoUri}
      label={step.label}
      ack={ack}
      alreadyDone={statuses[index] === "done"}
      onHear={() => speak(view.narration)}
      onDone={done}
      onHelp={needHelp}
      onBreak={takeBreak}
      onChoose={choose}
    />
  );

  const header = (
    <View style={{ gap: space.md }}>
      <PageHeader
        icon={ClipboardList}
        title={title}
        meta={[session.subject, `Step ${index + 1} of ${total}`, `${doneCount} done`].filter(Boolean).join(" · ")}
        right={
          <Dropdown<ViewMode>
            label="Viewing by"
            value={viewMode}
            options={[
              { value: "all", label: "All steps" },
              { value: "current", label: "Current step" },
            ]}
            onChange={setViewMode}
          />
        }
      />
      {/* Progress fill: steps finished, not time. */}
      <ProgressBar done={doneCount} total={total} noun="steps" />
    </View>
  );

  return (
    <Screen style={wide ? { maxWidth: MAX_WIDE_CONTENT_WIDTH } : undefined}>
      <Stack.Screen options={headerOptions} />
      {header}
      {wide ? (
        <View style={{ flexDirection: "row", gap: space.xxl, alignItems: "flex-start" }}>
          <View style={{ width: 360 }}>
            <Stepper items={visibleItems} currentKey={step.id} onSelect={jumpTo} />
          </View>
          <View style={{ flex: 1, gap: space.lg, paddingTop: space.sm }}>
            <AppText variant="display">{step.label}</AppText>
            {detail}
          </View>
        </View>
      ) : (
        <Stepper items={visibleItems} currentKey={step.id} onSelect={jumpTo} renderExpanded={() => detail} />
      )}
    </Screen>
  );
}

/**
 * The active step's support and actions. Two input modes, one help path:
 * the main buttons, and below a divider, the point-to-answer board (AAC
 * style, for kids who answer by pointing rather than talking). Its "Help"
 * tile calls the same needHelp() as the "I need help" button.
 */
function StepDetail({
  celebrating,
  showHint,
  hint,
  photo,
  photoUri,
  label,
  ack,
  alreadyDone,
  onHear,
  onDone,
  onHelp,
  onBreak,
  onChoose,
}: {
  celebrating: boolean;
  showHint: boolean;
  hint?: string;
  photo: "none" | "small" | "large";
  photoUri?: string;
  label: string;
  ack: string;
  alreadyDone: boolean;
  onHear: () => void;
  onDone: () => void;
  onHelp: () => void;
  onBreak: () => void;
  onChoose: (choice: (typeof CHOICES)[number]) => void;
}) {
  const theme = useAppTheme();
  const c = theme.colors;

  if (celebrating) return <Celebration />;

  return (
    <View style={{ gap: space.lg }}>
      {showHint && hint ? (
        <View style={{ flexDirection: "row", gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: c.accentSoft }}>
          <Icon icon={Lightbulb} size={18} color={c.text} />
          <AppText style={{ flex: 1 }}>{hint}</AppText>
        </View>
      ) : null}
      {photo !== "none" && photoUri ? (
        <Image
          source={{ uri: photoUri }}
          accessibilityLabel={`Picture for: ${label}`}
          contentFit="contain"
          style={{
            width: photo === "large" ? "100%" : "50%",
            aspectRatio: 4 / 3,
            borderRadius: radius.sm,
            alignSelf: "flex-start",
          }}
        />
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Hear it again" onPress={onHear} style={{ flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 32, alignSelf: "flex-start" }}>
        <Icon icon={Volume2} size={18} color={c.link} />
        <AppText variant="label" style={{ color: c.link }}>
          Hear it again
        </AppText>
      </Pressable>

      {ack ? (
        <AppText accessibilityLiveRegion="polite" muted>
          {ack}
        </AppText>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Button
          label={alreadyDone ? "Next step" : "Done"}
          icon={alreadyDone ? ArrowRight : Check}
          size="lg"
          onPress={onDone}
        />
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Button label="I need help" icon={Hand} variant="outline" onPress={onHelp} style={{ flex: 1 }} />
          <Button label="Take a break" icon={Coffee} variant="outline" onPress={onBreak} style={{ flex: 1 }} />
        </View>
      </View>

      {/* Point-to-answer board: a separate, AAC-style way to respond, set in its own sunken panel. */}
      <View
        style={{
          gap: space.sm,
          padding: space.md,
          borderRadius: radius.lg,
          backgroundColor: c.surfaceSunken,
          borderWidth: theme.highContrast ? 1 : 0,
          borderColor: c.border,
        }}
      >
        <View style={{ gap: 2 }}>
          <AppText variant="label">Answer by pointing</AppText>
          <AppText variant="caption" muted>
            Tap a picture to say yes, no, more time, or help.
          </AppText>
        </View>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          {CHOICES.map((ch) => (
            <Pressable
              key={ch.value}
              accessibilityRole="button"
              accessibilityLabel={`Choice: ${ch.label}`}
              onPress={() => onChoose(ch)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  minHeight: 68,
                  gap: space.xs,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radius.md,
                  backgroundColor: pressed ? c.secondarySoft : c.surface,
                  transform: pressed && !theme.reduceMotion ? [{ scale: 0.96 }] : undefined,
                },
                theme.elevation.card,
              ]}
            >
              <Icon icon={ch.icon} size={20} color={c.text} />
              <AppText variant="caption">{ch.label}</AppText>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Calm full-screen moment (break): soft sky chip, title, one line. */
function Moment({ icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  const theme = useAppTheme();
  const c = theme.colors;
  return (
    <View style={{ alignItems: "center", gap: space.lg, paddingVertical: space.xl }}>
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.secondarySoft,
        }}
      >
        <Icon icon={icon} size={40} color={c.text} />
      </View>
      <View style={{ alignItems: "center", gap: space.sm }}>
        <AppText variant="display" style={{ textAlign: "center" }}>
          {title}
        </AppText>
        <AppText muted style={{ textAlign: "center" }}>
          {body}
        </AppText>
      </View>
    </View>
  );
}
