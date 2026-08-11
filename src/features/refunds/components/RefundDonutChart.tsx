import { ResponsivePie, type ComputedDatum } from "@nivo/pie";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { formatCentsToBRL } from "@/lib/format";
import { useUiStore, resolveTheme } from "@/stores/ui";
import { readableTextOn, sliceColor, type DonutSlice } from "../lib/donutPalette";

interface RefundDonutChartProps {
  slices: DonutSlice[];
  // Rótulo da unidade sob o total, no miolo ("solicitações", "em reembolsos").
  unitLabelKey: string;
  // Como formatar total e valores. Contagem e dinheiro não são a mesma coisa e
  // não podem compartilhar formatação: um é inteiro, o outro tem centavos e
  // símbolo de moeda.
  metric: "count" | "currency";
  titleKey: string;
  isLoading?: boolean;
  isError?: boolean;
}

// O cromo (texto e linhas) precisa acompanhar o tema; as fatias, não. O
// #333333 do claro vem do exemplo do nivo; o do escuro é o token --foreground
// do index.css, escrito aqui em hexadecimal porque o nivo pinta via atributo
// SVG, onde `var(--token)` não é resolvido pelo navegador.
const CHROME = {
  light: { label: "#333333", muted: "#546672" },
  dark: { label: "#FAFAFA", muted: "#A1A1A1" },
} as const;

// As margens do nivo são pixels por contrato da lib. Não são medida de layout:
// são a reserva de espaço para as leader lines saírem do círculo e para a
// legenda caber embaixo. O gráfico continua se dimensionando pelo contêiner.
//
// Os valores do desktop são os do exemplo do nivo. No mobile eles encolhem
// porque 80px de cada lado, numa tela de 390px, deixariam menos da metade da
// largura para a rosca.
function chartMargin(isMobile: boolean) {
  return isMobile
    ? // bottom maior que no desktop apesar da tela menor: aqui a legenda ocupa
      // DUAS linhas (ver buildLegends), e a margem é o que reserva o espaço
      // delas. Sem isto a segunda linha é cortada pela borda do SVG.
      { top: 24, right: 40, bottom: 92, left: 40 }
    : { top: 40, right: 80, bottom: 80, left: 80 };
}

// Altura de uma linha da legenda e o quanto ela desce a partir do centro.
const LEGEND_ITEM_HEIGHT = 18;
const LEGEND_ROW_GAP = 4;

// No desktop, uma linha com todos os itens. No mobile, um 2x2: quatro rótulos
// lado a lado numa tela de 390px se sobrepõem, porque o nivo distribui os itens
// por `itemWidth` fixo e não quebra linha sozinho.
//
// A quebra é feita com DOIS objetos de legenda, cada um com o seu `data` — não
// existe "wrap" no nivo, mas nada impede duas legendas ancoradas no mesmo lugar
// com `translateY` diferente. Cada uma centraliza o próprio conteúdo, que é o
// que faz as duas colunas ficarem alinhadas entre si.
function buildLegends(
  items: { id: string; label: string; color: string }[],
  isMobile: boolean,
  textColor: string
) {
  const row = (data: typeof items, translateY: number) => ({
    anchor: "bottom" as const,
    direction: "row" as const,
    translateY,
    itemWidth: isMobile ? 96 : 100,
    itemHeight: LEGEND_ITEM_HEIGHT,
    symbolShape: "circle" as const,
    // Ausente no exemplo do nivo: sem isto a legenda herda o cinza escuro
    // padrão dele e some no tema escuro.
    itemTextColor: textColor,
    data,
  });

  if (!isMobile) return [row(items, 56)];

  const half = Math.ceil(items.length / 2);
  return [
    row(items.slice(0, half), 44),
    row(items.slice(half), 44 + LEGEND_ITEM_HEIGHT + LEGEND_ROW_GAP),
  ];
}

type Slice = ComputedDatum<ChartDatum>;

// O nivo chama `colors` ANTES de a fatia ter cor e arco calculados, então o
// parâmetro é a fatia sem esses três campos. Tipo derivado do próprio
// ComputedDatum, em vez de reescrito à mão: se o nivo mudar a assinatura, isto
// quebra no typecheck em vez de quebrar na tela.
type SliceBeforeColor = Omit<Slice, "fill" | "color" | "arc">;

// `label` traduzido entra no dado: o nivo tem um `MayHaveLabel` embutido e usa
// esse campo, quando existe, na legenda e no tooltip — sem ele os dois cairiam
// no `id`, que é o valor do contrato da API ("pending"), em inglês e imune à
// troca de idioma.
//
// A leader line é a exceção, e foi o bug: o acessor padrão dela é a string
// literal "id" (`arcLinkLabel:"id"` no fonte do @nivo/pie), então ela ignora o
// `label` e precisa ser apontada explicitamente — ver a prop `arcLinkLabel`
// mais abaixo.
type ChartDatum = DonutSlice & { label: string };

export default function RefundDonutChart({
  slices,
  unitLabelKey,
  metric,
  titleKey,
  isLoading = false,
  isError = false,
}: RefundDonutChartProps) {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const theme = useUiStore((s) => s.theme);
  const chrome = CHROME[resolveTheme(theme)];

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  function formatValue(value: number): string {
    return metric === "currency"
      ? formatCentsToBRL(value)
      : new Intl.NumberFormat(i18n.language).format(value);
  }

  if (isLoading) {
    return <Skeleton className="h-72 w-full" />;
  }

  // Um erro nunca pode cair em "zero renderizado": uma rosca vazia seria
  // indistinguível de um solicitante que de fato não tem nada.
  if (isError) {
    return (
      <p role="alert" className="py-8 text-center text-sm text-destructive">
        {t("chart.error")}
      </p>
    );
  }

  if (total === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("chart.empty")}</p>;
  }

  const data: ChartDatum[] = slices.map((slice) => ({ ...slice, label: t(slice.labelKey) }));

  // O rótulo acessível descreve o que o gráfico mostra, com os números — quem
  // usa leitor de tela não "vê" as fatias, e "gráfico de rosca" não informa
  // nada. Traz o total e os valores no mesmo formato do miolo e das fatias, de
  // modo que nenhum número do gráfico exista só em pixel.
  const ariaLabel = `${t(titleKey)}: ${formatValue(total)} ${t(unitLabelKey)}. ${data
    .map((slice) => `${slice.label}: ${formatValue(slice.value)}`)
    .join(", ")}.`;

  return (
    // A altura é fluida e a largura é do contêiner: o nivo mede o elemento e
    // desenha dentro dele. Nenhuma dimensão do gráfico é fixa.
    //
    // role/aria-label ficam no contêiner, não no <svg>: a versão instalada do
    // @nivo/pie não expõe as props de acessibilidade no tipo, e um elemento com
    // role="img" já faz o leitor de tela tratar toda a subárvore como uma
    // imagem só — que é exatamente o que um gráfico é para quem não o vê.
    <div className="h-[clamp(18rem,44vh,24rem)] w-full" role="img" aria-label={ariaLabel}>
      <ResponsivePie<ChartDatum>
        data={data}
        margin={chartMargin(isMobile)}
        innerRadius={0.5}
        padAngle={0.6}
        cornerRadius={2}
        activeOuterRadiusOffset={8}
        colors={(slice: SliceBeforeColor) => sliceColor(slices, String(slice.id))}
        // Sem isto a leader line escreve o `id` do contrato ("pending"), porque
        // o acessor padrão dela é "id" e não "label". Lê `datum.label`, que o
        // nivo já resolveu a partir do dado, para a tradução continuar tendo
        // uma origem só.
        arcLinkLabel={(slice: Slice) => String(slice.label)}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor={chrome.label}
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: "color" }}
        arcLabelsSkipAngle={10}
        // O exemplo do nivo usa modifiers [['darker', 2]], que só funciona com
        // a paleta pastel dele. Ver readableTextOn em lib/donutPalette.ts.
        arcLabelsTextColor={(slice: Slice) => readableTextOn(slice.color)}
        // O total no miolo não é camada do nivo — a rosca não tem slot para o
        // centro, o buraco é só ausência de arco. As quatro camadas padrão
        // precisam ser listadas junto, senão listar a nossa apagaria as delas.
        layers={[
          "arcs",
          "arcLinkLabels",
          "arcLabels",
          "legends",
          (layerProps) => (
            <CenteredTotal
              centerX={layerProps.centerX}
              centerY={layerProps.centerY}
              total={formatValue(total)}
              unit={t(unitLabelKey)}
              chrome={chrome}
            />
          ),
        ]}
        legends={buildLegends(
          data.map((slice) => ({
            id: slice.id,
            label: slice.label,
            // A legenda com `data` próprio não herda as cores das fatias —
            // quem passa a lista passa a cor junto, da mesma função que pinta
            // os arcos, para as duas nunca divergirem.
            color: sliceColor(slices, slice.id),
          })),
          isMobile,
          chrome.label
        )}
        // Animação do nivo é JavaScript (react-spring), então o
        // @media (prefers-reduced-motion) do index.css não a alcança.
        animate={!prefersReducedMotion}
        theme={{
          // Strings em rem, não números: o nivo trataria número como pixel, e
          // o gráfico deixaria de acompanhar a escala tipográfica do app.
          text: { fontSize: "0.8125rem", fill: chrome.label },
          tooltip: { container: { fontSize: "0.8125rem" } },
        }}
      />
    </div>
  );
}

// Total no miolo. É uma layer própria porque o nivo não tem slot para o centro
// da rosca — o buraco é só ausência de arco.
function CenteredTotal({
  centerX,
  centerY,
  total,
  unit,
  chrome,
}: {
  centerX: number;
  centerY: number;
  total: string;
  unit: string;
  chrome: (typeof CHROME)[keyof typeof CHROME];
}) {
  return (
    // pointer-events none para o texto do centro não roubar o hover das fatias
    // — que agora importa, porque activeOuterRadiusOffset reage ao hover.
    <g transform={`translate(${centerX},${centerY})`} style={{ pointerEvents: "none" }}>
      <text
        textAnchor="middle"
        y="-0.1em"
        fill={chrome.label}
        fontSize="1.7rem"
        fontWeight={700}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {total}
      </text>
      <text textAnchor="middle" y="1.35em" fill={chrome.muted} fontSize="0.8rem">
        {unit}
      </text>
    </g>
  );
}
