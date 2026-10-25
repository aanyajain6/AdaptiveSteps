import { router, useFocusEffect } from "expo-router";
import { ChartLine, ClipboardList, Eye, Layers, LogOut, ShieldCheck, Users } from "lucide-react-native";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { PageHeader, StatusList, StatusRow } from "../../components/structure";
import { AppText, Button, Screen } from "../../components/ui";
import * as db from "../../lib/db";
import { useApp } from "../../state/AppProvider";
import { space } from "../../theme/theme";

export default function ParentHome() {
  const { activeChild, lockParent } = useApp();
  const [counts, setCounts] = useState({ pending: 0, sessions: 0, cards: 0, children: 0 });

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        activeChild ? db.listPendingApprovals(activeChild.id) : Promise.resolve([]),
        activeChild ? db.listSessions(activeChild.id) : Promise.resolve([]),
        activeChild ? db.listReviewCards(activeChild.id) : Promise.resolve([]),
        db.listChildren(),
      ]).then(([pending, sessions, cards, children]) =>
        setCounts({ pending: pending.length, sessions: sessions.length, cards: cards.length, children: children.length })
      );
    }, [activeChild])
  );

  function exitParentMode() {
    lockParent();
    router.dismissTo("/");
  }

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  return (
    <Screen>
      <PageHeader
        icon={ShieldCheck}
        title="Parent Mode"
        meta={activeChild ? `Child Mode is set up for ${activeChild.name}` : "No child profile yet"}
      />

      {activeChild ? (
        <Button
          label={counts.pending ? `Review ${plural(counts.pending, "suggestion")}` : "View progress"}
          icon={ChartLine}
          size="lg"
          onPress={() => router.push("/parent/dashboard")}
        />
      ) : (
        <Button label="Add a child profile" icon={Users} size="lg" onPress={() => router.push({ pathname: "/parent/children/[id]", params: { id: "new" } })} />
      )}

      <View style={{ gap: space.sm }}>
        <AppText variant="overline" muted>
          Content{activeChild ? ` for ${activeChild.name}` : ""}
        </AppText>
        <StatusList>
          <StatusRow
            icon={ClipboardList}
            title="Study sessions"
            meta="Step-by-step routines for homework"
            trailing={activeChild ? String(counts.sessions) : undefined}
            onPress={() => router.push("/parent/sessions")}
          />
          <StatusRow
            icon={Layers}
            title="Review cards"
            meta="Spaced practice for facts and words"
            trailing={activeChild ? String(counts.cards) : undefined}
            onPress={() => router.push("/parent/cards")}
          />
          {activeChild ? (
            <StatusRow
              icon={ChartLine}
              title="Progress"
              meta="Charts, hardest steps, and why support changed"
              trailing={counts.pending ? `${counts.pending} waiting` : undefined}
              onPress={() => router.push("/parent/dashboard")}
            />
          ) : null}
        </StatusList>
      </View>

      <View style={{ gap: space.sm }}>
        <AppText variant="overline" muted>
          Settings
        </AppText>
        <StatusList>
          <StatusRow
            icon={Users}
            title="Child profiles"
            meta={counts.children ? plural(counts.children, "profile") : "Add your first profile"}
            onPress={() => router.push("/parent/children")}
          />
          <StatusRow
            icon={Eye}
            title="Accessibility"
            meta="Text size, contrast, motion"
            onPress={() => router.push("/parent/accessibility")}
          />
        </StatusList>
      </View>

      <Button label="Exit Parent Mode" icon={LogOut} variant="outline" onPress={exitParentMode} />
    </Screen>
  );
}
