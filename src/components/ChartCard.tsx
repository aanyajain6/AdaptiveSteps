// Frame for every dashboard chart: a title, a one-line plain-language
// explanation, the chart, and a "Show numbers" table so the data is
// never available only as a picture (screen readers, color vision).

import { useState } from "react";
import { ChevronUp, Table2 } from "lucide-react-native";
import { View } from "react-native";
import type { CartesianChartTheme } from "react-native-chart-kit/v2";
import { family, space, Theme } from "../theme/theme";
import { AppText, Button, Card } from "./ui";

export function chartTheme(theme: Theme): CartesianChartTheme {
  const c = theme.colors;
  return {
    background: c.page,
    plotBackground: c.page,
    grid: c.border,
    axis: c.border,
    text: c.text,
    mutedText: c.textMuted,
    series: [c.chart],
    typography: {
      fontFamily: family("semibold"),
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
      <View style={{ gap: space.xs }}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="caption" muted>
          {explanation}
        </AppText>
      </View>
      {empty ? (
        <AppText muted>{empty}</AppText>
      ) : (
        <>
          <View accessible accessibilityLabel={summary}>
            {children}
          </View>
          <Button
            label={showTable ? "Hide numbers" : "Show numbers"}
            icon={showTable ? ChevronUp : Table2}
            variant="ghost"
            onPress={() => setShowTable((s) => !s)}
            style={{ alignSelf: "flex-start", paddingHorizontal: 0 }}
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
