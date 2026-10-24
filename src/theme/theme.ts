// ============================================================
// Theme (UDL presentation settings, applied app-wide)
// ============================================================
// Built from the active child's ChildProfile: text size, high
// contrast, and reduced motion. This is purely HOW things look --
// it never changes how much support the engine gives.

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  success: string;
  warning: string;
  onWarning: string;
  danger: string;
}

// Calm, low-saturation palette: nothing alarming, nothing flashing.
const standard: ThemeColors = {
  background: "#F6F7F9",
  surface: "#FFFFFF",
  text: "#1C2430",
  textMuted: "#56606E",
  border: "#D5DBE3",
  primary: "#2F64C9",
  onPrimary: "#FFFFFF",
  primarySoft: "#E6EEFB",
  success: "#2D7D53",
  warning: "#F2C14E",
  onWarning: "#1C2430",
  danger: "#A93A3A",
};

// High contrast: black background, white text, yellow actions (well above WCAG AAA).
const highContrast: ThemeColors = {
  background: "#000000",
  surface: "#000000",
  text: "#FFFFFF",
  textMuted: "#FFFFFF",
  border: "#FFFFFF",
  primary: "#FFD600",
  onPrimary: "#000000",
  primarySoft: "#1A1A1A",
  success: "#5CFF8F",
  warning: "#FFD600",
  onWarning: "#000000",
  danger: "#FF8080",
};

export interface Theme {
  colors: ThemeColors;
  highContrast: boolean;
  reduceMotion: boolean;
  textScale: number;
  /** Scales a base font size by the child's text setting. */
  font: (size: number) => number;
  borderWidth: number;
  radius: number;
}

export const MIN_TEXT_SCALE = 1.0;
export const MAX_TEXT_SCALE = 2.0;

export function buildTheme(opts: {
  highContrast: boolean;
  reduceMotion: boolean;
  textScale: number;
}): Theme {
  const textScale = Math.max(MIN_TEXT_SCALE, Math.min(MAX_TEXT_SCALE, opts.textScale || 1));
  return {
    colors: opts.highContrast ? highContrast : standard,
    highContrast: opts.highContrast,
    reduceMotion: opts.reduceMotion,
    textScale,
    font: (size) => Math.round(size * textScale),
    borderWidth: opts.highContrast ? 2 : 1,
    radius: 14,
  };
}
