import { ResponsiveBar } from "@nivo/bar";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useUiStore } from "@/stores/ui";
import { axisChartTheme, chartChrome } from "../lib/chartChrome";
import { sliceColor, type DonutSlice } from "../lib/chartPalette";
import { monthLabel, visibleMonthTicks } from "../lib/monthLabel";
import { REFUND_STATUS } from "../constants/status";
import type { RefundStatus } from "../schemas/refund";
import type { RefundSummaryMonth } from "../schemas/summary";
import ChartFrame from "./ChartFrame";

interface RefundStackedBarChartProps {
  months: RefundSummaryMonth[];
  titleKey: string;
  isLoading?: boolean;
  isError?: boolean;
}

// A mesma ordem e o mesmo conjunto da rosca, porque as cores têm de ser as mesmas
// nos dois gráficos: cor segue a ENTIDADE, nunca o gráfico nem o ranking. Se
// "aprovada" fosse de uma cor aqui e de outra lá, a cor deixaria de identificar.
const STATUS_ORDER: readonly RefundStatus[] = ["pending", "approved", "paid", "rejected"];

// As fatias que a rosca monta, reconstruídas aqui só para alimentar sliceColor com
// a MESMA lista — é isso que garante cor idêntica nos dois gráficos, em vez de dois
// mapas de cor que podem divergir.
const COLOR_SLICES: DonutSlice[] = STATUS_ORDER.map((status) => ({
  id: status,
  labelKey: REFUND_STATUS[status].labelKey,
  value: 0,
  isNegative: status === "rejected",
}));

export default function RefundStackedBarChart({
  months,
  titleKey,
  isLoading = false,
  isError = false,
}: RefundStackedBarChartProps) {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const theme = useUiStore((s) => s.theme);
  const chrome = chartChrome(theme);

  const format = (value: number) => new Intl.NumberFormat(i18n.language).format(value);

  // Rótulo só com o MÊS: o ano vive no título do card, e repeti-lo em doze marcas
  // gastaria a largura que falta no mobile com a informação que não muda.
  const data = months.map((month) => ({
    month: monthLabel(month.month, i18n.language),
    ...Object.fromEntries(
      STATUS_ORDER.map((status) => [status, month.by_status[status].count])
    ),
  }));

  // Doze rótulos não cabem em 390px. No mobile rotulamos um a cada dois — as doze
  // barras continuam lá, só a rotulagem rareia.
  const ticks = visibleMonthTicks(
    data.map((entry) => entry.month as string),
    isMobile
  );

  const total = months.reduce((sum, month) => sum + month.count, 0);

  const ariaLabel = `${t(titleKey)}. ${months
    .map(
      (month) =>
        `${monthLabel(month.month, i18n.language)}: ${format(month.count)} — ${STATUS_ORDER.map(
          (status) => `${t(REFUND_STATUS[status].labelKey)} ${format(month.by_status[status].count)}`
        ).join(", ")}`
    )
    .join(". ")}.`;

  return (
    <ChartFrame
      ariaLabel={ariaLabel}
      isLoading={isLoading}
      isError={isError}
      isEmpty={total === 0}
    >
      <ResponsiveBar
        data={data}
        keys={[...STATUS_ORDER]}
        indexBy="month"
        margin={{ top: 8, right: 16, bottom: 56, left: 40 }}
        colors={(bar: { id: string | number }) => sliceColor(COLOR_SLICES, String(bar.id))}
        padding={0.3}
        // MITIGAÇÃO, e o motivo está registrado no spec: duas cores desta paleta
        // ("aprovada" #A8DADC e "paga" #F1FAEE) têm ΔE 12,9 em visão normal, abaixo
        // do piso de 15 do validador. Como aqui elas ficam empilhadas e vizinhas,
        // sem as leader lines que salvam a rosca, o gap de 2px na cor da superfície
        // e a legenda são o que separa os segmentos. É mitigação de uma falha
        // conhecida, não a correção dela — corrigir é trocar a paleta, que muda a
        // cor da rosca já entregue e é ciclo próprio.
        innerPadding={2}
        borderRadius={2}
        enableGridX={false}
        enableGridY
        axisLeft={{ tickSize: 0, tickPadding: 8, format: (value: number) => format(value) }}
        axisBottom={{ tickSize: 0, tickPadding: 8, tickValues: ticks }}
        // Sem rótulo dentro dos segmentos: eles são finos quando a contagem é
        // baixa, e um número que aparece só nos grossos é pior que nenhum.
        enableLabel={false}
        // Legenda SEMPRE presente: com quatro séries, identidade não pode depender
        // só da cor — e menos ainda com o par problemático desta paleta.
        legends={[
          {
            dataFrom: "keys",
            anchor: "bottom",
            direction: "row",
            translateY: 48,
            itemWidth: isMobile ? 74 : 92,
            itemHeight: 16,
            symbolSize: 10,
            // Quadrado com borda, e não círculo: o contorno é o que separa as duas
            // cores claras entre si na própria legenda.
            symbolShape: "square",
            data: STATUS_ORDER.map((status) => ({
              id: status,
              label: t(REFUND_STATUS[status].labelKey),
              color: sliceColor(COLOR_SLICES, status),
            })),
          },
        ]}
        tooltip={({ id, value, indexValue }) => (
          <div className="rounded-md border bg-popover px-2 py-1 text-popover-foreground shadow-sm">
            <div className="font-medium">{String(indexValue)}</div>
            <div style={{ fontVariantNumeric: "tabular-nums" }}>
              {t(REFUND_STATUS[id as RefundStatus].labelKey)}: {format(value)}
            </div>
          </div>
        )}
        animate={!prefersReducedMotion}
        theme={axisChartTheme(chrome)}
      />
    </ChartFrame>
  );
}
