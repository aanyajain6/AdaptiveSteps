import { router, useFocusEffect } from "expo-router";
import { ChartLine, ClipboardList, Eye, Layers, LogOut, Users } from "lucide-react-native";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { AppText, Badge, Button, Card, IconTile, ListGroup, ListRow, Screen, Section } from "../../components/ui";
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
      <Card raised style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
        <IconTile icon={Users} size={48} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="overline" muted>
            Child Mode
          </AppText>
          <AppText variant="title">{activeChild?.name ?? "No profile yet"}</AppText>
        </View>
        {counts.pending > 0 && <Badge label={`${counts.pending} to review`} />}
      </Card>

      {activeChild && (
        <Section title="Insights">
          <ListGroup>
            <ListRow
              icon={ChartLine}
              title="Progress"
              subtitle={counts.pending ? "Suggestions waiting for your OK" : "Charts, hardest steps, and change history"}
              trailing={counts.pending ? `${counts.pending} new` : undefined}
              onPress={() => router.push("/parent/dashboard")}
            />
          </ListGroup>
        </Section>
      )}

      <Section title="Content">
        <ListGroup>
          <ListRow
            icon={ClipboardList}
            title="Study sessions"
            subtitle="Step-by-step routines for homework"
            trailing={activeChild ? String(counts.sessions) : undefined}
            onPress={() => router.push("/parent/sessions")}
          />
          <ListRow
            icon={Layers}
            title="Review cards"
            subtitle="Spaced practice for facts and words"
            trailing={activeChild ? String(counts.cards) : undefined}
            onPress={() => router.push("/parent/cards")}
          />
        </ListGroup>
      </Section>

      <Section title="Settings">
        <ListGroup>
          <ListRow
            icon={Users}
            title="Child profiles"
            subtitle={counts.children ? plural(counts.children, "profile") : "Add your first profile"}
            onPress={() => router.push("/parent/children")}
          />
          <ListRow
            icon={Eye}
            title="Accessibility"
            subtitle="Text size, contrast, motion"
            onPress={() => router.push("/parent/accessibility")}
          />
        </ListGroup>
      </Section>

      <Button label="Exit Parent Mode" icon={LogOut} variant="secondary" onPress={exitParentMode} />
    </Screen>
  );
}
