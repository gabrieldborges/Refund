import { ResponsiveBar } from "@nivo/bar";
import { useTranslation } from "react-i18next";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { formatCentsToBRL } from "@/lib/format";
import { useUiStore } from "@/stores/ui";
import { axisChartTheme, chartChrome } from "../lib/chartChrome";
import { PALETTE } from "../lib/chartPalette";
import ChartFrame from "./ChartFrame";

export interface BarDatum {
  id: string;
  labelKey: string;
  value: number;
}

interface RefundBarChartProps {
  bars: BarDatum[];
  titleKey: string;
  metric: "count" | "currency";
  isLoading?: boolean;
  isError?: boolean;
}

// UMA cor para todas as barras, e isso é decisão, não economia. A identidade de
// cada barra já está no eixo, como rótulo de texto — pintar cada uma de uma cor
// seria codificação redundante, e a paleta tem 4 slots para 5 categorias, então
// ciclar repetiria a primeira cor sem erro nenhum. Ver o comentário de sliceColor.
const BAR_COLOR = PALETTE[1];

// Barras HORIZONTAIS: os rótulos são texto ("Alimentação", "Hospedagem"), e na
// horizontal eles ficam legíveis sem rotação nem truncamento.
export default function RefundBarChart({
  bars,
  titleKey,
  metric,
  isLoading = false,
  isError = false,
}: RefundBarChartProps) {
  const { t, i18n } = useTranslation();
  const prefersReducedMotion = usePrefersReducedMotion();
  const theme = useUiStore((s) => s.theme);
  const chrome = chartChrome(theme);

  function formatValue(value: number): string {
    return metric === "currency"
      ? formatCentsToBRL(value)
      : new Intl.NumberFormat(i18n.language).format(value);
  }

  // Ordenado do maior para o menor: numa comparação de magnitudes, a ordem é o que
  // responde "qual é o maior" sem o leitor ter de varrer o eixo.
  const data = [...bars]
    .sort((a, b) => a.value - b.value)
    .map((bar) => ({ id: bar.id, label: t(bar.labelKey), value: bar.value }));

  const total = bars.reduce((sum, bar) => sum + bar.value, 0);

  const ariaLabel = `${t(titleKey)}. ${data
    .map((bar) => `${bar.label}: ${formatValue(bar.value)}`)
    .join(", ")}.`;

  return (
    <ChartFrame
      ariaLabel={ariaLabel}
      isLoading={isLoading}
      isError={isError}
      isEmpty={total === 0}
    >
      <ResponsiveBar
        data={data}
        keys={["value"]}
        indexBy="label"
        layout="horizontal"
        margin={{ top: 8, right: 24, bottom: 32, left: 96 }}
        // Uma série só: sem legenda. O título do card já nomeia o que está sendo
        // medido, e uma legenda de um item é ruído.
        colors={BAR_COLOR}
        // 2px de folga entre barras vizinhas, para as bordas não encostarem.
        padding={0.3}
        borderRadius={4}
        enableGridX
        enableGridY={false}
        axisLeft={{ tickSize: 0, tickPadding: 8 }}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          format: (value: number) =>
            metric === "currency"
              ? formatCentsToBRL(value)
              : new Intl.NumberFormat(i18n.language).format(value),
        }}
        // Sem rótulo dentro da barra: com valores em centavos o texto não cabe nas
        // barras curtas, e um rótulo que aparece só nas longas é pior que nenhum.
        // O valor exato vem do tooltip.
        enableLabel={false}
        tooltip={({ indexValue, value }) => (
          <div className="rounded-md border bg-popover px-2 py-1 text-popover-foreground shadow-sm">
            <span className="font-medium">{indexValue}</span>
            {": "}
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatValue(value)}</span>
          </div>
        )}
        // A animação do Nivo é JavaScript (react-spring), então o
        // @media (prefers-reduced-motion) do index.css não a alcança.
        animate={!prefersReducedMotion}
        theme={axisChartTheme(chrome)}
      />
    </ChartFrame>
  );
}
