// ============================================================
// Design system
// ============================================================
// The single source for color, type, spacing, radius, and elevation.
// Components read tokens from here and never hard-code a value.
//
// Built from the active child's ChildProfile (UDL settings: text size,
// high contrast, reduced motion). This is purely HOW things look -- it
// never changes how much support the engine gives.

import { TextStyle, ViewStyle } from "react-native";

// ---------- Palette ----------
// One brand hue (deep teal: calm, not alarm-red or default-iOS blue),
// warm neutrals instead of stark white, and status colors kept
// separate from the brand. All text pairings are WCAG AA or better.

const brand = {
  600: "#0F6E64", // primary actions/text on light: 6.1:1 on white
  500: "#109383", // chart series (passes chroma + contrast checks)
  100: "#E4F1EE", // tinted fills
  50: "#F1F8F6",
};

const neutral = {
  0: "#FFFFFF",
  25: "#FBFAF8", // card surface: off-white, not stark
  50: "#F6F5F1", // app background
  100: "#EEECE7",
  200: "#E3E1DB", // hairline borders
  300: "#CFCCC4",
  500: "#5D6066", // secondary text: 5.8:1 on background
  900: "#18191D", // primary text: near-black
};

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSunken: string;
  field: string;
  text: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  chart: string;
  // Structured (list/stepper) layouts: white page, ink actions, accent only for links/progress.
  page: string;
  ink: string;
  onInk: string;
  link: string;
  divider: string;
  // Tablet nav rail.
  rail: string;
  onRail: string;
  onRailMuted: string;
  railAccent: string;
  success: string;
  warning: string;
  onWarning: string;
  danger: string;
}

const standard: ThemeColors = {
  background: neutral[50],
  surface: neutral[25],
  surfaceSunken: neutral[100],
  field: neutral[0],
  text: neutral[900],
  textMuted: neutral[500],
  border: neutral[200],
  borderStrong: neutral[300],
  primary: brand[600],
  onPrimary: neutral[0],
  primarySoft: brand[100],
  chart: brand[500],
  page: neutral[0],
  ink: "#1F2328",
  onInk: neutral[0],
  link: brand[600],
  divider: "#E6E6E3",
  rail: "#16213A", // navy
  onRail: neutral[0], // 16:1
  onRailMuted: "#A9B4C8", // 7.7:1
  railAccent: brand[500], // 4.2:1, above the 3:1 non-text minimum
  success: "#2F7D4F",
  warning: "#E9B949",
  onWarning: neutral[900],
  danger: "#B4472F",
};

// High contrast: black background, white text, yellow actions (well above WCAG AAA).
const highContrast: ThemeColors = {
  background: "#000000",
  surface: "#000000",
  surfaceSunken: "#141414",
  field: "#000000",
  text: "#FFFFFF",
  textMuted: "#FFFFFF",
  border: "#FFFFFF",
  borderStrong: "#FFFFFF",
  primary: "#FFD600",
  onPrimary: "#000000",
  primarySoft: "#1F1F1F",
  chart: "#FFD600",
  page: "#000000",
  ink: "#FFD600",
  onInk: "#000000",
  link: "#FFD600",
  divider: "#FFFFFF",
  rail: "#000000",
  onRail: "#FFFFFF",
  onRailMuted: "#FFFFFF",
  railAccent: "#FFD600",
  success: "#5CFF8F",
  warning: "#FFD600",
  onWarning: "#000000",
  danger: "#FF8A80",
};

// ---------- Type ----------
// Inter, loaded in the root layout. Weight is chosen by family name
// (not fontWeight) so it renders identically on iOS, Android, and web.

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export type TextVariant = "display" | "title" | "heading" | "body" | "label" | "caption" | "overline";

// size, line height, family, tracking. Headings track tight; small caps track open.
const TYPE: Record<TextVariant, [number, number, keyof typeof fonts, number]> = {
  display: [30, 36, "bold", -0.8],
  title: [22, 28, "bold", -0.45],
  heading: [17, 24, "semibold", -0.2],
  body: [16, 24, "regular", -0.1],
  label: [15, 20, "semibold", -0.1],
  caption: [13, 18, "medium", 0],
  overline: [12, 16, "semibold", 0.6],
};

// ---------- Space, radius, size ----------

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
/** Content never stretches past this on tablets/web. */
export const MAX_CONTENT_WIDTH = 560;
/** From this width up: tablet layout (nav rail, side-by-side stepper and detail). */
export const TABLET_BREAKPOINT = 820;
/** Content width for side-by-side tablet layouts. */
export const MAX_WIDE_CONTENT_WIDTH = 1040;
/** Minimum touch target -- above the 44/48pt platform minimums, on purpose. */
export const MIN_TOUCH = 48;

export interface Theme {
  colors: ThemeColors;
  highContrast: boolean;
  reduceMotion: boolean;
  textScale: number;
  /** Scales a base font size by the child's text setting. */
  font: (size: number) => number;
  /** Full text style for a type-scale step, scaled by the child's text setting. */
  type: (variant: TextVariant) => TextStyle;
  borderWidth: number;
  radius: number;
  /** Intentional, quiet elevation. High contrast swaps shadow for a solid border. */
  elevation: { card: ViewStyle; raised: ViewStyle };
}

export const MIN_TEXT_SCALE = 1.0;
export const MAX_TEXT_SCALE = 2.0;

export function buildTheme(opts: {
  highContrast: boolean;
  reduceMotion: boolean;
  textScale: number;
}): Theme {
  const textScale = Math.max(MIN_TEXT_SCALE, Math.min(MAX_TEXT_SCALE, opts.textScale || 1));
  const colors = opts.highContrast ? highContrast : standard;
  const font = (size: number) => Math.round(size * textScale);

  const elevation = opts.highContrast
    ? {
        card: { borderWidth: 2, borderColor: colors.border },
        raised: { borderWidth: 2, borderColor: colors.border },
      }
    : {
        card: {
          borderWidth: 1,
          borderColor: colors.border,
          boxShadow: "0px 1px 2px rgba(24, 25, 29, 0.04), 0px 1px 1px rgba(24, 25, 29, 0.03)",
        },
        raised: {
          borderWidth: 1,
          borderColor: colors.border,
          boxShadow: "0px 4px 12px rgba(24, 25, 29, 0.06), 0px 1px 3px rgba(24, 25, 29, 0.05)",
        },
      };

  return {
    colors,
    highContrast: opts.highContrast,
    reduceMotion: opts.reduceMotion,
    textScale,
    font,
    type: (variant) => {
      const [size, lineHeight, family, letterSpacing] = TYPE[variant];
      return {
        fontFamily: fonts[family],
        fontSize: font(size),
        lineHeight: font(lineHeight),
        letterSpacing,
        textTransform: variant === "overline" ? "uppercase" : undefined,
      };
    },
    borderWidth: opts.highContrast ? 2 : 1,
    radius: radius.md,
    elevation,
  };
}
