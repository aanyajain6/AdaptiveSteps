import { fonts, Theme } from "./theme";

/** Native header styling shared by every stack: quiet, flat, on the app background. */
export function stackOptions(theme: Theme) {
  return {
    headerStyle: { backgroundColor: theme.colors.background },
    headerShadowVisible: false,
    headerTintColor: theme.colors.primary,
    headerTitleStyle: { color: theme.colors.text, fontFamily: fonts.semibold, fontSize: theme.font(17) },
    headerBackTitleStyle: { fontFamily: fonts.medium },
    contentStyle: { backgroundColor: theme.colors.background },
    animation: theme.reduceMotion ? ("none" as const) : ("default" as const),
  };
}
