import { ResponsiveLine } from "@nivo/line";
import { useTranslation } from "react-i18next";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { formatCentsToBRL } from "@/lib/format";
import { useUiStore } from "@/stores/ui";
import { axisChartTheme, chartChrome } from "../lib/chartChrome";
import { PALETTE } from "../lib/chartPalette";
import ChartFrame from "./ChartFrame";

export interface LinePoint {
  label: string;
  value: number;
}

interface RefundLineChartProps {
  points: LinePoint[];
  titleKey: string;
  // UMA unidade, sempre. O componente aceita uma métrica só de propósito: valor e
  // contagem no mesmo gráfico exigiriam dois eixos y, que é o erro mais comum em
  // visualização — as duas escalas ficam arbitrárias e qualquer cruzamento das
  // linhas passa a ser coincidência de escala, não fato.
  metric: "count" | "currency";
  isLoading?: boolean;
  isError?: boolean;
}

const LINE_COLOR = PALETTE[0];

export default function RefundLineChart({
  points,
  titleKey,
  metric,
  isLoading = false,
  isError = false,
}: RefundLineChartProps) {
  const { t, i18n } = useTranslation();
  const prefersReducedMotion = usePrefersReducedMotion();
  const theme = useUiStore((s) => s.theme);
  const chrome = chartChrome(theme);

  function formatValue(value: number): string {
    return metric === "currency"
      ? formatCentsToBRL(value)
      : new Intl.NumberFormat(i18n.language).format(value);
  }

  const total = points.reduce((sum, point) => sum + point.value, 0);

  const ariaLabel = `${t(titleKey)}. ${points
    .map((point) => `${point.label}: ${formatValue(point.value)}`)
    .join(", ")}.`;

  const data = [
    {
      id: "value",
      data: points.map((point) => ({ x: point.label, y: point.value })),
    },
  ];

  return (
    <ChartFrame
      ariaLabel={ariaLabel}
      isLoading={isLoading}
      isError={isError}
      isEmpty={total === 0}
    >
      <ResponsiveLine
        data={data}
        margin={{ top: 12, right: 20, bottom: 32, left: 72 }}
        xScale={{ type: "point" }}
        // Começa em zero, sempre. Um eixo truncado exagera a variação: a mesma
        // série pode parecer um salto ou uma linha plana só mudando o mínimo.
        yScale={{ type: "linear", min: 0, max: "auto" }}
        curve="monotoneX"
        colors={[LINE_COLOR]}
        lineWidth={2}
        // Pontos visíveis: com 6 meses eles marcam onde há dado de verdade, e
        // distinguem "zero medido" de "linha passando por ali".
        pointSize={8}
        pointBorderWidth={2}
        pointBorderColor={{ from: "serieColor" }}
        pointColor={chrome.grid}
        enableGridX={false}
        enableGridY
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          format: (value: number) =>
            metric === "currency"
              ? formatCentsToBRL(value)
              : new Intl.NumberFormat(i18n.language).format(value),
        }}
        axisBottom={{ tickSize: 0, tickPadding: 8 }}
        // Uma série só: sem legenda, o título nomeia.
        enableSlices="x"
        sliceTooltip={({ slice }) => (
          <div className="rounded-md border bg-popover px-2 py-1 text-popover-foreground shadow-sm">
            <div className="font-medium">{String(slice.points[0]?.data.x ?? "")}</div>
            <div style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatValue(Number(slice.points[0]?.data.y ?? 0))}
            </div>
          </div>
        )}
        animate={!prefersReducedMotion}
        theme={axisChartTheme(chrome)}
      />
    </ChartFrame>
  );
}
