import { Platform } from "react-native";
import { family, Theme } from "./theme";

// Web only: the default back arrow ships from node_modules, which some static
// hosts won't serve (same root cause as the old font bug). Native keeps its
// platform chevron/arrow.
const WEB_BACK_ICON =
  Platform.OS === "web"
    ? { headerBackIcon: { type: "image" as const, source: require("../../assets/icons/back-arrow.png") } }
    : {};

/** Native header styling shared by every stack: quiet and shadowless, on the cream page. */
export function stackOptions(theme: Theme) {
  return {
    headerStyle: { backgroundColor: theme.colors.page },
    headerShadowVisible: false,
    // Deep coral: the back arrow is an icon and needs 3:1 (brand coral is 2.7:1 on cream).
    headerTintColor: theme.colors.link,
    headerTitleStyle: { color: theme.colors.text, fontFamily: family("display"), fontSize: theme.font(18) },
    headerBackTitleStyle: { fontFamily: family("semibold") },
    contentStyle: { backgroundColor: theme.colors.page },
    animation: theme.reduceMotion ? ("none" as const) : ("default" as const),
    ...WEB_BACK_ICON,
  };
}
