import { ResponsiveLine } from "@nivo/line";
import { useTranslation } from "react-i18next";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useUiStore } from "@/stores/ui";
import { axisChartTheme, chartChrome } from "../lib/chartChrome";
import { PALETTE } from "../lib/chartPalette";
import ChartFrame from "./ChartFrame";

export interface LinePoint {
  // O que o eixo X mostra: o mês no Dashboard, o dia no Calendário. Só o que varia
  // entre as marcas — o período comum vive no título do card.
  label: string;
  // O que o eixo Y desenha, JÁ na unidade de exibição.
  value: number;
  // O valor exato, formatado, para o tooltip. É ele que permite o eixo arredondar.
  exact: string;
}

interface RefundLineChartProps {
  points: LinePoint[];
  titleKey: string;
  // Rótulo da unidade acima do gráfico. Ausente quando não há unidade a declarar —
  // uma contagem é uma contagem.
  unitLabelKey?: string;
  // Quais rótulos o eixo mostra. Ausente = todos. Serve ao mobile, onde doze meses
  // ou trinta e um dias não cabem lado a lado.
  visibleLabels?: string[];
  isLoading?: boolean;
  isError?: boolean;
}

const LINE_COLOR = PALETTE[0];

// Uma série num eixo, e nada mais. O gráfico NÃO sabe se aquilo é dinheiro: quem
// chama converte antes e passa `value` na unidade final e `exact` já formatado.
//
// Antes ele recebia centavos e uma prop `metric` para ramificar. O Calendário
// precisou dele com contagem por dia, e a alternativa era uma terceira ramificação —
// então a conversão subiu para o chamador, que é quem sabe o que está medindo.
export default function RefundLineChart({
  points,
  titleKey,
  unitLabelKey,
  visibleLabels,
  isLoading = false,
  isError = false,
}: RefundLineChartProps) {
  const { t, i18n } = useTranslation();
  const prefersReducedMotion = usePrefersReducedMotion();
  const theme = useUiStore((s) => s.theme);
  const chrome = chartChrome(theme);

  const integer = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 });
  const total = points.reduce((sum, point) => sum + point.value, 0);

  // O rótulo acessível traz o valor EXATO, não o número arredondado do eixo: quem
  // usa leitor de tela não tem o rótulo de unidade acima do gráfico para
  // interpretar um número solto.
  const ariaLabel = `${t(titleKey)}. ${points
    .map((point) => `${point.label}: ${point.exact}`)
    .join(", ")}.`;

  const data = [
    {
      id: "value",
      data: points.map((point) => ({ x: point.label, y: point.value, exact: point.exact })),
    },
  ];

  return (
    <>
      {unitLabelKey && (
        <p className="mb-1 text-xs text-muted-foreground">{t(unitLabelKey)}</p>
      )}
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
          // Pontos visíveis: eles marcam onde há dado de verdade, e distinguem
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
            // Inteiros: a unidade está declarada acima do gráfico, então casas
            // decimais aqui seriam ruído.
            format: (value: number) => integer.format(value),
          }}
          axisBottom={{ tickSize: 0, tickPadding: 8, tickValues: visibleLabels }}
          enableSlices="x"
          sliceTooltip={({ slice }) => {
            const point = slice.points[0];
            const exact = String((point?.data as { exact?: string } | undefined)?.exact ?? "");
            return (
              <div className="rounded-md border bg-popover px-2 py-1 text-popover-foreground shadow-sm">
                <div className="font-medium">{String(point?.data.x ?? "")}</div>
                <div style={{ fontVariantNumeric: "tabular-nums" }}>{exact}</div>
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
