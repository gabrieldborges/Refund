import { resolveTheme } from "@/stores/ui";

export interface HeatStep {
  background: string;
  // Cor do número do dia sobre este degrau. Fixada por degrau, e não calculada em
  // tempo de execução, porque cada par foi MEDIDO: ver o comentário das rampas.
  foreground: string;
}

// Rampa de UMA matiz, do pálido ao escuro. Sequencial, não arco-íris.
//
// Uma contagem é magnitude: vai de zero a muito, sem meio nem polaridade. Uma
// escala frio→quente (azul, verde, amarelo, laranja, vermelho) foi medida e
// **não tem luminância monotônica** — o amarelo do meio é mais claro que o verde
// antes dele. Isso quebra a ordenação por escuridão, que é o canal pré-atentivo:
// com ela, ordenar dias exige decodificar matiz contra a legenda em vez de bater
// o olho. E verde contra vermelho é o par clássico de confusão para daltonismo
// deuterânope, o que aproximaria justamente os dois extremos da escala.
//
// Cada degrau traz a cor do número do dia junto, e os pares foram medidos: o pior
// caso é 4,56:1, acima do 4,5 que WCAG AA pede para texto pequeno. Existe uma
// FAIXA PROIBIDA de luminância (0,183 a 0,270) onde nem texto branco nem escuro
// alcançam 4,5 — a rampa salta essa faixa entre o 3º e o 4º degrau de propósito.
const LIGHT: readonly HeatStep[] = [
  { background: "#FDE7CE", foreground: "#1F2933" },
  { background: "#F9C285", foreground: "#1F2933" },
  { background: "#F09A4A", foreground: "#1F2933" },
  { background: "#C25510", foreground: "#FFFFFF" },
  { background: "#8F2C0A", foreground: "#FFFFFF" },
];

// O escuro tem degraus PRÓPRIOS, e não a mesma rampa: no escuro a luminância
// CRESCE com a contagem.
//
// Reaproveitar a rampa clara inverteria a hierarquia visual — o creme pálido de
// "1 solicitação" ficaria mais proeminente sobre um card escuro do que o vermelho
// escuro do dia mais movimentado. O que ordena não é "mais escuro", é "mais
// contraste contra a superfície", e em fundo escuro isso significa mais claro.
const DARK: readonly HeatStep[] = [
  { background: "#4A2A14", foreground: "#FFFFFF" },
  { background: "#7A3F17", foreground: "#FFFFFF" },
  { background: "#B0621C", foreground: "#FFFFFF" },
  { background: "#DE8C2E", foreground: "#1F2933" },
  { background: "#F6B455", foreground: "#1F2933" },
];

export const HEAT_STEPS = LIGHT.length;

export function heatSteps(theme: Parameters<typeof resolveTheme>[0]): readonly HeatStep[] {
  return resolveTheme(theme) === "dark" ? DARK : LIGHT;
}

// O maior valor do mês é o topo da escala.
//
// Domínio ADAPTATIVO, não fixo. Um domínio fixo de 0 a 200 funcionaria com volumes
// grandes e mentiria com os atuais: a poucas solicitações por dia, todo dia cairia
// no degrau mais pálido e o calendário não informaria nada. Adaptativo usa a faixa
// inteira com qualquer volume, hoje e depois.
//
// O preço é que a mesma cor significa contagens diferentes em meses diferentes —
// e é por isso que a legenda com os números é obrigatória nesta visualização, não
// enfeite.
export function heatMax(counts: readonly number[]): number {
  return counts.reduce((max, count) => Math.max(max, count), 0);
}

// Qual degrau uma contagem ocupa, ou `null` para zero.
//
// Zero não recebe degrau nenhum: num calendário a ausência de marca já lê como
// zero, e pintar 31 células de "nada" gastaria a escala com a informação menos
// interessante da tela.
export function heatStepIndex(count: number, max: number): number | null {
  if (count <= 0) return null;
  if (max <= 0) return null;

  // PISO no número de degraus, e isto foi um teste que pegou: sem ele, um mês com
  // uma única solicitação punha aquele dia no degrau mais ESCURO — vermelho de
  // alarme para um pedido só, porque ele era tecnicamente o máximo do mês.
  //
  // O degrau mais escuro significa "movimentado", e um mês com duas solicitações
  // não tem dia movimentado. Abaixo do piso a contagem mapeia direto no degrau:
  // 1 → o primeiro, 2 → o segundo. Acima dele a escala volta a esticar até o
  // máximo real.
  const span = Math.max(max, HEAT_STEPS);

  const index = Math.ceil((count / span) * HEAT_STEPS) - 1;
  return Math.min(Math.max(index, 0), HEAT_STEPS - 1);
}

// Os limites de cada degrau, para a legenda dizer o que cada cor significa.
// Devolve o MAIOR valor que cai em cada degrau, que é o que se lê num rótulo
// "até N".
export function heatStepBounds(max: number): number[] {
  // O mesmo piso do heatStepIndex, senão a legenda anunciaria faixas que a grade
  // não usa — num mês de duas solicitações ela diria "até 2" no último degrau
  // enquanto nenhuma célula chegaria lá.
  const span = Math.max(max, HEAT_STEPS);
  return Array.from({ length: HEAT_STEPS }, (_, index) =>
    Math.max(1, Math.round(((index + 1) / HEAT_STEPS) * span))
  );
}
