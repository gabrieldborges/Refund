import { PALETTE, readableTextOn, sliceColor, type DonutSlice } from "./chartPalette";

// As fatias de status na MESMA ordem e com os mesmos sinalizadores da rosca, para
// sliceColor devolver exatamente as cores que o gráfico usa. Reconstruir a lista é
// o que garante isso — um mapa de cor separado poderia divergir do gráfico sem
// ninguém notar.
const STATUS_SLICES: DonutSlice[] = [
  { id: "pending", labelKey: "refund.status.pending", value: 0 },
  { id: "approved", labelKey: "refund.status.approved", value: 0 },
  { id: "paid", labelKey: "refund.status.paid", value: 0 },
  { id: "rejected", labelKey: "refund.status.rejected", value: 0, isNegative: true },
];

function tone(background: string) {
  // O texto é CALCULADO do fundo, não escolhido: dois dos fundos são pastéis
  // claros e dois são escuros, então uma cor de texto fixa falharia em metade
  // deles. readableTextOn já existia para o rótulo dentro da rosca.
  return { background, foreground: readableTextOn(background) };
}

// Semântico onde dá, neutro onde não dá.
//
// "Pendentes" recebe exatamente a cor que a rosca usa para pendente — mesma
// entidade, mesma cor, que é o que faz a cor significar algo em vez de decorar.
// "Aprovado + pago" recebe a de aprovada, a mais próxima de honesta para um card
// que soma dois status. E "Solicitações" é o total, que não é status nenhum: recebe
// o azul escuro da paleta, que nenhuma fatia usa nesta tela.
export const KPI_TONES = {
  total: tone(PALETTE[0]),
  settled: tone(sliceColor(STATUS_SLICES, "approved")),
  pending: tone(sliceColor(STATUS_SLICES, "pending")),
} as const;
