// Frame for every dashboard chart: a title, a one-line plain-language
// explanation, the chart, and a "Show numbers" table so the data is
// never available only as a picture (screen readers, color vision).

import { useState } from "react";
import { Platform, View } from "react-native";
import type { CartesianChartTheme } from "react-native-chart-kit/v2";
import { Theme } from "../theme/theme";
import { AppText, Button, Card } from "./ui";

export function chartTheme(theme: Theme): CartesianChartTheme {
  const c = theme.colors;
  return {
    background: c.surface,
    plotBackground: c.surface,
    grid: c.border,
    axis: c.border,
    text: c.text,
    mutedText: c.textMuted,
    series: [c.primary],
    typography: {
      // SVG text on web otherwise falls back to the browser's serif default.
      fontFamily: Platform.OS === "web" ? "system-ui, -apple-system, sans-serif" : undefined,
      axisLabelSize: theme.font(12),
      legendLabelSize: theme.font(12),
    },
    tooltip: { background: c.surface, border: c.border, text: c.text, mutedText: c.textMuted, fontSize: theme.font(13) },
  };
}

export function ChartCard({
  title,
  explanation,
  summary,
  rows,
  empty,
  children,
}: {
  title: string;
  explanation: string;
  /** One sentence read by screen readers in place of the chart. */
  summary: string;
  rows: [string, string][];
  /** Shown instead of the chart when there isn't enough data yet. */
  empty?: string;
  children: React.ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <Card>
      <AppText variant="heading">{title}</AppText>
      <AppText variant="caption" muted>
        {explanation}
      </AppText>
      {empty ? (
        <AppText muted>{empty}</AppText>
      ) : (
        <>
          <View accessible accessibilityLabel={summary}>
            {children}
          </View>
          <Button
            label={showTable ? "Hide numbers" : "Show numbers"}
            variant="quiet"
            onPress={() => setShowTable((s) => !s)}
          />
          {showTable &&
            rows.map(([k, v], i) => (
              <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <AppText variant="caption">{k}</AppText>
                <AppText variant="caption">{v}</AppText>
              </View>
            ))}
        </>
      )}
    </Card>
  );
}
