import { resolveTheme } from "@/stores/ui";

// O cromo (texto, linhas de eixo, grade) precisa acompanhar o tema; as cores das
// séries, não. Em hexadecimal porque o Nivo pinta por atributo SVG, onde
// `var(--token)` não é resolvido pelo navegador — a mesma razão que fez o
// RefundDonutChart nascer com esta constante, agora compartilhada pelos quatro
// gráficos em vez de copiada em cada um.
//
// Os valores são os mesmos dos tokens --foreground, --muted-foreground e --border
// do index.css.
const CHROME = {
  light: { label: "#2E3B47", muted: "#546672", grid: "#E3E8EB" },
  dark: { label: "#FAFAFA", muted: "#A1A1A1", grid: "#3A3A3A" },
} as const;

export type ChartChrome = (typeof CHROME)[keyof typeof CHROME];

export function chartChrome(theme: Parameters<typeof resolveTheme>[0]): ChartChrome {
  return CHROME[resolveTheme(theme)];
}

// O tema do Nivo compartilhado pelos gráficos de eixo (barras e linha). Tamanhos
// em STRING rem, não número: número o Nivo trata como pixel, e o gráfico deixaria
// de acompanhar a escala tipográfica da aplicação.
export function axisChartTheme(chrome: ChartChrome) {
  return {
    text: { fontSize: "0.8125rem", fill: chrome.label },
    axis: {
      ticks: { text: { fontSize: "0.75rem", fill: chrome.muted } },
      domain: { line: { stroke: chrome.grid } },
    },
    grid: { line: { stroke: chrome.grid, strokeWidth: 1 } },
    legends: { text: { fontSize: "0.75rem", fill: chrome.label } },
    tooltip: { container: { fontSize: "0.8125rem" } },
  };
}
