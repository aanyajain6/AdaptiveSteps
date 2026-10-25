// ============================================================
// Hop, the mascot
// ============================================================
// Hop climbs one step at a time -- the app's idea in one picture.
// Used sparingly: empty states, finishing a session, and the app
// icon. A visit, not wallpaper. Artwork from the brand kit; colors
// are the brand palette and stay fixed in every theme (it's an
// illustration, not UI chrome).

import { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { useAppTheme } from "../state/AppProvider";

const CORAL = "#FF6B4A";
const CORAL_DEEP = "#E8562F";
const BLUSH = "#FFB199";
const INK = "#2B2240";
const SKY = "#3DADE8";
const SUN = "#FFC93C";

/** Full illustration: Hop waving on a three-step staircase. */
export function Hop({
  size = 160,
  label = "Hop, the AdaptiveSteps mascot, waving from the top of a staircase",
  bounce = false,
}: {
  /** Rendered width; height follows the artwork's 320x360 ratio. */
  size?: number;
  label?: string;
  /** One gentle hop on appear (skipped with reduced motion). */
  bounce?: boolean;
}) {
  const theme = useAppTheme();
  const animate = bounce && !theme.reduceMotion;
  const [y] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!animate) return;
    Animated.sequence([
      Animated.timing(y, { toValue: -14, duration: 220, useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [animate, y]);

  return (
    <Animated.View accessible accessibilityRole="image" accessibilityLabel={label} style={{ transform: [{ translateY: y }] }}>
      <Svg width={size} height={(size * 360) / 320} viewBox="0 0 320 360">
        {/* ground shadow */}
        <Ellipse cx={210} cy={224} rx={46} ry={9} fill={INK} opacity={0.12} />

        {/* staircase */}
        <Rect x={28} y={308} width={82} height={32} rx={12} fill={SKY} opacity={0.55} />
        <Rect x={98} y={266} width={82} height={74} rx={12} fill={SKY} opacity={0.78} />
        <Rect x={168} y={218} width={84} height={122} rx={14} fill={SKY} />

        {/* sparkles */}
        <G fill={SUN}>
          <Path d="M120 72 l4 11 11 4 -11 4 -4 11 -4 -11 -11 -4 11 -4 z" />
          <Path d="M253 58 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" />
        </G>

        {/* arms */}
        <G fill={CORAL_DEEP}>
          <Rect x={248} y={150} width={22} height={48} rx={11} transform="rotate(25 248 150)" />
          <Circle cx={286} cy={183} r={12} />
          <Rect x={152} y={96} width={22} height={52} rx={11} transform="rotate(-35 152 96)" />
          <Circle cx={131} cy={93} r={12} />
        </G>

        {/* antenna */}
        <Path d="M212 92 C 206 78, 212 70, 222 64" stroke={CORAL_DEEP} strokeWidth={5} fill="none" strokeLinecap="round" />
        <Path d="M222 54 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" fill={SUN} />

        {/* feet */}
        <Ellipse cx={190} cy={207} rx={17} ry={13} fill={CORAL_DEEP} />
        <Ellipse cx={230} cy={207} rx={17} ry={13} fill={CORAL_DEEP} />

        {/* body */}
        <Ellipse cx={210} cy={150} rx={58} ry={63} fill={CORAL} />

        {/* cheeks */}
        <Circle cx={178} cy={164} r={10} fill={BLUSH} opacity={0.7} />
        <Circle cx={242} cy={164} r={10} fill={BLUSH} opacity={0.7} />

        {/* eyes */}
        <Ellipse cx={190} cy={140} rx={12} ry={14} fill="#FFFFFF" />
        <Ellipse cx={230} cy={140} rx={12} ry={14} fill="#FFFFFF" />
        <Circle cx={192} cy={143} r={6} fill={INK} />
        <Circle cx={232} cy={143} r={6} fill={INK} />
        <Circle cx={194.5} cy={140} r={2} fill="#FFFFFF" />
        <Circle cx={234.5} cy={140} r={2} fill="#FFFFFF" />

        {/* smile */}
        <Path d="M194 172 Q210 186 226 172" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

/**
 * Simplified face crop for small sizes: app icon ("square") and
 * avatar/favicon ("circle"). Decorative by default -- it sits beside
 * the wordmark, which already names the app.
 */
export function HopFace({ size = 32, shape = "square" }: { size?: number; shape?: "square" | "circle" }) {
  return (
    // aria-hidden on a View is the cross-platform way to hide decoration (native-only
    // props on <Svg> would leak onto the web DOM as unknown attributes).
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {shape === "square" ? <Rect width={120} height={120} rx={30} fill={CORAL} /> : <Circle cx={60} cy={60} r={60} fill={CORAL} />}
        {shape === "square" ? (
          <>
            <Circle cx={40} cy={65} r={9} fill={BLUSH} opacity={0.7} />
            <Circle cx={80} cy={65} r={9} fill={BLUSH} opacity={0.7} />
          </>
        ) : null}
        <Ellipse cx={46} cy={58} rx={10} ry={12} fill="#FFFFFF" />
        <Ellipse cx={74} cy={58} rx={10} ry={12} fill="#FFFFFF" />
        <Circle cx={48} cy={61} r={5} fill={INK} />
        <Circle cx={76} cy={61} r={5} fill={INK} />
        <Path d="M46 82 Q60 94 74 82" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
        {shape === "square" ? <Path d="M66 36 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill={SUN} /> : null}
      </Svg>
    </View>
  );
}
