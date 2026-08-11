import { ResponsiveBar } from "@nivo/bar";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { formatCentsToBRL } from "@/lib/format";
import { useUiStore } from "@/stores/ui";
import { axisChartTheme, chartChrome } from "../lib/chartChrome";
import { PALETTE } from "../lib/chartPalette";
import { scaleValue, valueScaleFor } from "../lib/valueScale";
import ChartFrame from "./ChartFrame";

export interface BarDatum {
  id: string;
  labelKey: string;
  // Sempre em centavos: a conversão para a unidade do eixo é do gráfico.
  cents: number;
}

interface RefundBarChartProps {
  bars: BarDatum[];
  titleKey: string;
  isLoading?: boolean;
  isError?: boolean;
}

// UMA cor para todas as barras, e isso é decisão, não economia. A identidade de
// cada barra já está no eixo X, como rótulo de texto — pintar cada uma de uma cor
// seria codificação redundante, e a paleta tem 4 slots para 5 categorias, então
// ciclar repetiria a primeira cor sem erro nenhum. Ver o comentário de sliceColor.
const BAR_COLOR = PALETTE[1];

// Barras VERTICAIS: categoria no eixo X, valor no eixo Y.
export default function RefundBarChart({
  bars,
  titleKey,
  isLoading = false,
  isError = false,
}: RefundBarChartProps) {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const theme = useUiStore((s) => s.theme);
  const chrome = chartChrome(theme);

  // A unidade sai do maior valor da série, e vale para todas as barras: unidades
  // diferentes no mesmo eixo tornariam as alturas incomparáveis.
  const scale = valueScaleFor(bars.map((bar) => bar.cents));
  const integer = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 });

  const data = bars.map((bar) => ({
    label: t(bar.labelKey),
    value: scaleValue(bar.cents, scale),
    cents: bar.cents,
  }));

  const total = bars.reduce((sum, bar) => sum + bar.cents, 0);

  // O rótulo acessível traz o valor EXATO em reais, não o número arredondado do
  // eixo: quem usa leitor de tela não tem o rótulo de unidade acima do gráfico
  // para interpretar um "340" solto.
  const ariaLabel = `${t(titleKey)}. ${bars
    .map((bar) => `${t(bar.labelKey)}: ${formatCentsToBRL(bar.cents)}`)
    .join(", ")}.`;

  return (
    <>
      {/* O rótulo da unidade fica ACIMA do gráfico, não repetido em cada marca do
          eixo: é a mesma informação para todas as marcas, e no eixo ela gastaria a
          largura que falta no mobile. */}
      <p className="mb-1 text-xs text-muted-foreground">{t(scale.unitLabelKey)}</p>
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
          layout="vertical"
          margin={{ top: 8, right: 12, bottom: isMobile ? 60 : 40, left: 44 }}
          colors={BAR_COLOR}
          padding={0.3}
          borderRadius={4}
          enableGridX={false}
          enableGridY
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            format: (value: number) => integer.format(value),
          }}
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            // No mobile os cinco rótulos de categoria não cabem lado a lado, então
            // eles giram em vez de colidir ou serem cortados. No desktop cabem
            // retos.
            tickRotation: isMobile ? -45 : 0,
          }}
          enableLabel={false}
          tooltip={({ indexValue, data: datum }) => (
            <div className="rounded-md border bg-popover px-2 py-1 text-popover-foreground shadow-sm">
              <span className="font-medium">{indexValue}</span>
              {": "}
              {/* O tooltip mostra o valor EXATO, que é o motivo de o eixo poder
                  ser arredondado. */}
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatCentsToBRL(datum.cents)}
              </span>
            </div>
          )}
          animate={!prefersReducedMotion}
          theme={axisChartTheme(chrome)}
        />
      </ChartFrame>
    </>
  );
}
