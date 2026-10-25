// Tablet-only primary navigation: a slim, icon-only navy rail with a
// single accent bar on the active item. Phones keep the stack nav.
// Every icon carries an accessibility label since there's no text.

import { Href, router, usePathname } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import { ChartLine, ClipboardList, House, Layers } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "../state/AppProvider";
import { radius, space } from "../theme/theme";
import { BrandMark } from "./Brand";
import { Icon } from "./ui";

interface RailItem {
  label: string;
  icon: LucideIcon;
  href: Href;
  isActive: (path: string) => boolean;
  /** Behind the parent PIN. */
  parentOnly?: boolean;
}

const ITEMS: RailItem[] = [
  { label: "Home", icon: House, href: "/", isActive: (p) => p === "/" },
  { label: "Sessions", icon: ClipboardList, href: "/sessions", isActive: (p) => p.startsWith("/session") },
  { label: "Review cards", icon: Layers, href: "/review", isActive: (p) => p.startsWith("/review") },
  {
    label: "Parent dashboard",
    icon: ChartLine,
    href: "/parent/dashboard",
    isActive: (p) => p.startsWith("/parent") || p.startsWith("/pin"),
    parentOnly: true,
  },
];

export const NAV_RAIL_WIDTH = 72;

export function NavRail() {
  const { theme, parentUnlocked } = useApp();
  const c = theme.colors;
  const path = usePathname();

  function go(item: RailItem) {
    if (item.parentOnly && !parentUnlocked) {
      router.push({ pathname: "/pin", params: { next: item.href as string } });
    } else {
      router.navigate(item.href);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom", "left"]} style={{ width: NAV_RAIL_WIDTH, backgroundColor: c.rail }}>
      <View accessibilityRole="tablist" style={{ alignItems: "center", gap: space.sm, paddingTop: space.lg }}>
        <View style={{ marginBottom: space.lg }}>
          <BrandMark size={32} />
        </View>
        {ITEMS.map((item) => {
          const active = item.isActive(path);
          return (
            <Pressable
              key={item.label}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityHint={item.parentOnly && !parentUnlocked ? "Requires the parent PIN" : undefined}
              aria-selected={active}
              onPress={() => go(item)}
              style={({ pressed }) => ({
                width: NAV_RAIL_WIDTH,
                height: 52,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {active ? (
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 10,
                    bottom: 10,
                    width: 4,
                    borderTopRightRadius: radius.sm,
                    borderBottomRightRadius: radius.sm,
                    backgroundColor: c.railAccent,
                  }}
                />
              ) : null}
              <Icon icon={item.icon} size={24} color={active ? c.onRail : c.onRailMuted} />
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
