// ============================================================
// Design system
// ============================================================
// The single source for color, type, spacing, radius, and elevation.
// Components read tokens from here and never hard-code a value.
//
// Built from the active child's ChildProfile (UDL settings: text size,
// high contrast, reduced motion). This is purely HOW things look -- it
// never changes how much support the engine gives.

import { Platform, TextStyle, ViewStyle } from "react-native";

// ---------- Palette ----------
// Warm and playful: cream page, plum ink, coral primary, sky, sunshine,
// leaf. The brand hexes are used as given for FILLS. Where a brand color
// would be TEXT, a deeper shade of the same hue stands in, because
// coral (2.7:1), sky (2.4:1) and leaf (2.9:1) are all below WCAG AA as
// text on cream. Every text pairing below is 4.5:1 or better.

const brand = {
  cream: "#FFF8EC",
  ink: "#2B2240", // plum: 14:1 on cream
  coral: "#FF6B4A",
  sky: "#3DADE8",
  sunshine: "#FFC93C",
  leaf: "#3FA66B",
};

export interface ThemeColors {
  /** Page background. */
  page: string;
  background: string;
  /** Raised surfaces: cards, rows, inputs. */
  surface: string;
  surfaceSunken: string;
  field: string;
  text: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  divider: string;
  /** Coral: the one primary action per screen, the active step. */
  primary: string;
  /** Label color on a coral fill: plum (5.3:1). White on coral is only 2.8:1. */
  onPrimary: string;
  primarySoft: string;
  /** Text links and other accent-colored text: deep coral (5.3:1 on cream). */
  link: string;
  /** Sky: secondary/info fills and icon chips (plum icons on it; white is only 2.5:1). */
  secondary: string;
  secondarySoft: string;
  /** Sunshine: rewards, streaks, highlights. */
  accent: string;
  accentSoft: string;
  /** Leaf: done/correct fills (checks, progress). */
  success: string;
  successSoft: string;
  /** Text/icons on an accent-filled shape (e.g. the active stepper circle). */
  onInk: string;
  chart: string;
  // Tablet nav rail.
  rail: string;
  onRail: string;
  onRailMuted: string;
  railAccent: string;
  warning: string;
  onWarning: string;
  danger: string;
}

const standard: ThemeColors = {
  page: brand.cream,
  background: brand.cream,
  surface: "#FFFFFF",
  surfaceSunken: "#F6EDDD",
  field: "#FFFFFF",
  text: brand.ink,
  textMuted: "#6B6378", // 5.4:1 on cream, 4.9:1 on the sunken fill
  border: "#EEE7DE", // ink at ~8% on cream
  borderStrong: "#D9D1CD",
  divider: "#EEE7DE",
  primary: brand.coral,
  onPrimary: brand.ink,
  primarySoft: "#FFE3DB",
  link: "#B8401F",
  secondary: brand.sky,
  secondarySoft: "#DDF0FB",
  accent: brand.sunshine,
  accentSoft: "#FFF0C4",
  success: brand.leaf,
  successSoft: "#DDF1E5",
  onInk: brand.ink,
  chart: "#1F7FB5", // deep sky: passes the chart contrast/chroma checks
  rail: brand.ink,
  onRail: brand.cream, // 14:1
  onRailMuted: "#BDB3C9", // 7.4:1
  railAccent: brand.coral, // 5.3:1 on plum
  warning: brand.sunshine,
  onWarning: brand.ink,
  danger: "#B3261E", // distinct from coral so "delete" never reads as "go"
};

// High contrast: black background, white text, yellow actions (well above WCAG AAA).
// A separate override, deliberately untouched by the playful palette.
const highContrast: ThemeColors = {
  page: "#000000",
  background: "#000000",
  surface: "#000000",
  surfaceSunken: "#141414",
  field: "#000000",
  text: "#FFFFFF",
  textMuted: "#FFFFFF",
  border: "#FFFFFF",
  borderStrong: "#FFFFFF",
  divider: "#FFFFFF",
  primary: "#FFD600",
  onPrimary: "#000000",
  primarySoft: "#1F1F1F",
  link: "#FFD600",
  secondary: "#FFFFFF",
  secondarySoft: "#1F1F1F",
  accent: "#FFD600",
  accentSoft: "#1F1F1F",
  success: "#5CFF8F",
  successSoft: "#1F1F1F",
  onInk: "#000000",
  chart: "#FFD600",
  rail: "#000000",
  onRail: "#FFFFFF",
  onRailMuted: "#FFFFFF",
  railAccent: "#FFD600",
  warning: "#FFD600",
  onWarning: "#000000",
  danger: "#FF8A80",
};

// ---------- Type ----------
// Fredoka (rounded display face) for headings and the wordmark only;
// Nunito for everything people actually read. Both are bundled from
// assets/fonts and loaded in the root layout. Weight is chosen by
// family name (not fontWeight) so it renders the same everywhere.

export const fonts = {
  display: "Fredoka_600SemiBold",
  regular: "Nunito_400Regular",
  semibold: "Nunito_600SemiBold",
  bold: "Nunito_700Bold",
  extrabold: "Nunito_800ExtraBold",
} as const;

type FontKey = keyof typeof fonts;

// On web a family that fails to load would fall back to the browser's
// default serif. A system stack behind it makes that impossible.
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const WEB_FALLBACK: Record<FontKey, string> = {
  display: `ui-rounded, 'Arial Rounded MT Bold', ${SANS}`,
  regular: SANS,
  semibold: SANS,
  bold: SANS,
  extrabold: SANS,
};

/** The fontFamily value to use for a font: a single name natively, a full stack on web. */
export function family(key: FontKey): string {
  return Platform.OS === "web" ? `${fonts[key]}, ${WEB_FALLBACK[key]}` : fonts[key];
}

/** "lead" is large reading text (e.g. a sentence-length answer): big, but never the display face. */
export type TextVariant = "display" | "title" | "heading" | "lead" | "body" | "label" | "caption" | "overline";

// size, line height, family, tracking.
const TYPE: Record<TextVariant, [number, number, FontKey, number]> = {
  display: [30, 36, "display", -0.3],
  title: [22, 28, "display", -0.2],
  heading: [18, 24, "display", 0],
  lead: [20, 28, "bold", 0],
  body: [16, 24, "regular", 0],
  label: [15, 20, "bold", 0],
  caption: [13, 18, "semibold", 0],
  overline: [12, 16, "extrabold", 0.8],
};

// ---------- Space, radius, size ----------

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 12, md: 16, lg: 20, pill: 999 } as const;
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
  /**
   * Soft, plum-tinted depth. card = rows and panels, raised = the thing
   * to look at (current step, open menu), primary = the coral button's
   * glow. High contrast swaps every shadow for a solid border.
   */
  elevation: { card: ViewStyle; raised: ViewStyle; primary: ViewStyle };
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
        primary: {},
      }
    : {
        card: {
          borderWidth: 2,
          borderColor: colors.border,
          boxShadow: "0px 4px 12px rgba(43, 34, 64, 0.06)",
        },
        raised: {
          borderWidth: 2,
          borderColor: colors.border,
          boxShadow: "0px 10px 28px rgba(43, 34, 64, 0.10)",
        },
        primary: { boxShadow: "0px 8px 18px rgba(255, 107, 74, 0.35)" },
      };

  return {
    colors,
    highContrast: opts.highContrast,
    reduceMotion: opts.reduceMotion,
    textScale,
    font,
    type: (variant) => {
      const [size, lineHeight, key, letterSpacing] = TYPE[variant];
      return {
        fontFamily: family(key),
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
