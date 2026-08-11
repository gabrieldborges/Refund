import { ResponsiveBar } from "@nivo/bar";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { formatCentsToBRL } from "@/lib/format";
import { useUiStore } from "@/stores/ui";
import { axisChartTheme, chartChrome } from "../lib/chartChrome";
import { categoryColor } from "../lib/categoryPalette";
import { scaleValue, valueScaleFor } from "../lib/valueScale";
import type { RefundCategory } from "../constants/categories";
import ChartFrame from "./ChartFrame";

export interface BarDatum {
  id: RefundCategory;
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

// Barras VERTICAIS, valor no eixo Y, e a categoria **só na legenda**.
//
// Uma cor por categoria, o que é o oposto da primeira versão — e a razão mudou junto
// com o desenho. Enquanto o nome da categoria estava no eixo X, colorir era
// codificação redundante: a identidade já estava escrita. Sem rótulo no eixo, a cor
// passa a ser a ÚNICA identidade, e aí ela não é redundante, é necessária.
//
// Isso exige cinco cores distintas, que a paleta de status não tem — ver
// categoryPalette.ts. E torna a legenda obrigatória: com identidade só na cor, sem
// legenda o gráfico não é legível por ninguém, com ou sem daltonismo.
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

  // A unidade sai do maior valor da série e vale para todas as barras: unidades
  // diferentes no mesmo eixo tornariam as alturas incomparáveis.
  const scale = valueScaleFor(bars.map((bar) => bar.cents));
  const integer = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 });

  const data = bars.map((bar) => ({
    // O `id` da categoria como índice, e não o rótulo traduzido: é ele que liga a
    // barra à cor e à legenda, e um índice que muda de idioma quebraria essa ligação.
    category: bar.id,
    label: t(bar.labelKey),
    // Valor SEM arredondar. Arredondar aqui fazia uma categoria de R$ 300 ao lado de
    // uma de R$ 15.000 virar exatamente 0 — e 0 já significa "categoria sem nenhuma
    // solicitação". Quem arredonda é o formatador das marcas do eixo.
    value: scaleValue(bar.cents, scale),
    cents: bar.cents,
  }));

  const total = bars.reduce((sum, bar) => sum + bar.cents, 0);

  // O rótulo acessível traz o valor EXATO em reais, e o nome de cada categoria: quem
  // não vê as cores não tem legenda que sirva, então é aqui que a identidade e o
  // número precisam estar por escrito.
  const ariaLabel = `${t(titleKey)}. ${bars
    .map((bar) => `${t(bar.labelKey)}: ${formatCentsToBRL(bar.cents)}`)
    .join(", ")}.`;

  return (
    <>
      {/* A unidade fica ACIMA do gráfico: ela é a mesma para todas as marcas, e no
          eixo gastaria a largura que falta no mobile. */}
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
          indexBy="category"
          layout="vertical"
          // bottom generoso: é onde a legenda mora, em duas linhas no mobile.
          margin={{ top: 8, right: 12, bottom: isMobile ? 76 : 56, left: 48 }}
          colors={(bar: { data: { category: RefundCategory } }) =>
            categoryColor(bar.data.category, theme)
          }
          padding={0.3}
          borderRadius={4}
          enableGridX={false}
          enableGridY
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            // Inteiro AQUI, no rótulo — não no valor da barra. É a separação que o
            // defeito anterior não tinha.
            format: (value: number) => integer.format(value),
          }}
          // Sem eixo inferior: a identidade das barras vive na legenda, que é o que
          // você pediu, e é o que libera a largura que cinco rótulos de texto
          // consumiam no mobile.
          axisBottom={null}
          enableLabel={false}
          legends={[
            {
              // `dataFrom` é exigido pelo tipo, mesmo passando `data` explícito.
              // "indexes" é o correto aqui: cada barra é um índice (uma categoria),
              // não uma série — a série é uma só, "value".
              dataFrom: "indexes",
              anchor: "bottom",
              direction: "row",
              translateY: isMobile ? 68 : 48,
              itemWidth: isMobile ? 84 : 96,
              itemHeight: 16,
              symbolSize: 10,
              // Quadrado com contorno, não círculo: o contorno é o que separa duas
              // cores vizinhas na própria legenda.
              symbolShape: "square",
              itemTextColor: chrome.label,
              // A legenda com `data` próprio não herda as cores das barras: quem
              // passa a lista passa a cor junto, da MESMA função que pinta as barras,
              // para as duas nunca divergirem.
              data: bars.map((bar) => ({
                id: bar.id,
                label: t(bar.labelKey),
                color: categoryColor(bar.id, theme),
              })),
            },
          ]}
          tooltip={({ data: datum }) => (
            <div className="rounded-md border bg-popover px-2 py-1 text-popover-foreground shadow-sm">
              <span className="font-medium">{String(datum.label)}</span>
              {": "}
              {/* O valor EXATO, que é o que permite o eixo arredondar. */}
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatCentsToBRL(Number(datum.cents))}
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
