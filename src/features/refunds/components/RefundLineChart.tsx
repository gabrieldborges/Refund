import { ResponsiveLine } from "@nivo/line";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { formatCentsToBRL } from "@/lib/format";
import { useUiStore } from "@/stores/ui";
import { axisChartTheme, chartChrome } from "../lib/chartChrome";
import { PALETTE } from "../lib/chartPalette";
import { monthLabel, visibleMonthTicks } from "../lib/monthLabel";
import { scaleValue, valueScaleFor } from "../lib/valueScale";
import ChartFrame from "./ChartFrame";

interface RefundLineChartProps {
  // Cada ponto é um mês "YYYY-MM" com o valor em centavos. O gráfico rotula com o
  // MÊS apenas — o ano vive no título do card, porque é o mesmo para os doze
  // pontos e no eixo gastaria a largura que falta no mobile.
  months: { month: string; cents: number }[];
  titleKey: string;
  isLoading?: boolean;
  isError?: boolean;
}

const LINE_COLOR = PALETTE[0];

export default function RefundLineChart({
  months,
  titleKey,
  isLoading = false,
  isError = false,
}: RefundLineChartProps) {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const theme = useUiStore((s) => s.theme);
  const chrome = chartChrome(theme);

  const scale = valueScaleFor(months.map((month) => month.cents));
  const integer = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 });

  const labelled = months.map((entry) => ({
    ...entry,
    label: monthLabel(entry.month, i18n.language),
  }));

  const total = months.reduce((sum, month) => sum + month.cents, 0);

  const ariaLabel = `${t(titleKey)}. ${labelled
    .map((entry) => `${entry.label}: ${formatCentsToBRL(entry.cents)}`)
    .join(", ")}.`;

  const data = [
    {
      id: "value",
      data: labelled.map((entry) => ({
        x: entry.label,
        y: scaleValue(entry.cents, scale),
        cents: entry.cents,
      })),
    },
  ];

  // Doze rótulos não cabem em 390px: eles colidem, ou o Nivo os corta. No mobile
  // rotulamos um mês a cada dois — a LINHA continua com os doze pontos, só a
  // rotulagem rareia.
  const ticks = visibleMonthTicks(
    labelled.map((entry) => entry.label),
    isMobile
  );

  return (
    <>
      <p className="mb-1 text-xs text-muted-foreground">{t(scale.unitLabelKey)}</p>
      <ChartFrame
        ariaLabel={ariaLabel}
        isLoading={isLoading}
        isError={isError}
        isEmpty={total === 0}
      >
        <ResponsiveLine
          data={data}
          margin={{ top: 12, right: 16, bottom: 32, left: 44 }}
          xScale={{ type: "point" }}
          // Começa em zero, sempre. Um eixo truncado exagera a variação: a mesma
          // série pode parecer um salto ou uma linha plana só mudando o mínimo.
          yScale={{ type: "linear", min: 0, max: "auto" }}
          curve="monotoneX"
          colors={[LINE_COLOR]}
          lineWidth={2}
          // Pontos visíveis: eles marcam onde há mês de verdade, e distinguem
          // "zero medido" de "linha passando por ali".
          pointSize={8}
          pointBorderWidth={2}
          pointBorderColor={{ from: "serieColor" }}
          pointColor={chrome.grid}
          enableGridX={false}
          enableGridY
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            format: (value: number) => integer.format(value),
          }}
          axisBottom={{ tickSize: 0, tickPadding: 8, tickValues: ticks }}
          enableSlices="x"
          sliceTooltip={({ slice }) => {
            const point = slice.points[0];
            const cents = Number(
              (point?.data as { cents?: number } | undefined)?.cents ?? 0
            );
            return (
              <div className="rounded-md border bg-popover px-2 py-1 text-popover-foreground shadow-sm">
                <div className="font-medium">{String(point?.data.x ?? "")}</div>
                {/* Valor exato no tooltip, que é o que permite o eixo arredondar. */}
                <div style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCentsToBRL(cents)}
                </div>
              </div>
            );
          }}
          animate={!prefersReducedMotion}
          theme={axisChartTheme(chrome)}
        />
      </ChartFrame>
    </>
  );
}
