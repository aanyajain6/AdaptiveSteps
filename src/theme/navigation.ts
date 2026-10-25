import { fonts, Theme } from "./theme";

/** Native header styling shared by every stack: quiet, flat, on the white page. */
export function stackOptions(theme: Theme) {
  return {
    headerStyle: { backgroundColor: theme.colors.page },
    headerShadowVisible: false,
    headerTintColor: theme.colors.primary,
    headerTitleStyle: { color: theme.colors.text, fontFamily: fonts.semibold, fontSize: theme.font(17) },
    headerBackTitleStyle: { fontFamily: fonts.medium },
    contentStyle: { backgroundColor: theme.colors.page },
    animation: theme.reduceMotion ? ("none" as const) : ("default" as const),
  };
}
