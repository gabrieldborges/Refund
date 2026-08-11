export interface DonutSlice {
  id: string;
  // Chave do catálogo, não o rótulo pronto: quem monta as fatias normalmente é
  // um módulo avaliado na importação (constants/status.ts), antes de existir
  // locale. Quem renderiza traduz.
  labelKey: string;
  value: number;
  // O vermelho da paleta é reservado a esta fatia, qualquer que seja o tamanho
  // dela. Cor com significado não pode depender da posição no ranking.
  isNegative?: boolean;
}

// Paleta fixa, da maior fatia para a menor. O vermelho fica de fora desta
// ordem: ele é atribuído por significado, não por tamanho.
export const PALETTE = ["#1D3557", "#457B9D", "#A8DADC", "#F1FAEE"] as const;
export const NEGATIVE_COLOR = "#E63946";

// Em módulo próprio, e não junto do componente, por dois motivos: é a única
// regra com lógica de verdade em todo o gráfico — e testá-la aqui é mais
// preciso do que procurar atributos `fill` no SVG que o nivo gera — e o
// react-refresh exige que um arquivo de componente exporte só componentes.
// Cor de texto legível SOBRE uma fatia. O exemplo do nivo usa
// `modifiers: [['darker', 2]]`, que funciona porque a paleta padrão dele é toda
// pastel: escurecer um tom claro dá contraste. A nossa tem #1D3557 e #457B9D —
// escurecer o azul-marinho produz preto sobre azul-escuro, ilegível. Então a
// decisão passa a ser por luminância: texto escuro sobre fatia clara, texto
// claro sobre fatia escura.
//
// A fórmula é a luminância relativa aproximada do sRGB (os pesos 0.299/0.587/
// 0.114 refletem o quanto o olho humano enxerga cada canal — o verde domina, o
// azul quase não conta). Acima de meio caminho a cor é "clara".
export function readableTextOn(hex: string): string {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.5 ? "#1F2933" : "#FFFFFF";
}

export function sliceColor(slices: readonly DonutSlice[], id: string): string {
  const slice = slices.find((candidate) => candidate.id === id);
  if (slice?.isNegative) return NEGATIVE_COLOR;

  // O índice conta só as fatias não negativas. Se contasse todas, a fatia
  // vermelha consumiria uma posição da paleta e deixaria um buraco — duas
  // fatias vizinhas pulariam uma cor entre si sem motivo visível.
  const index = slices.filter((candidate) => !candidate.isNegative).findIndex((c) => c.id === id);
  return PALETTE[(index < 0 ? 0 : index) % PALETTE.length];
}
