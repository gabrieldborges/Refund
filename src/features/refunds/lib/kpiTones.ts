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

// A sequência dos três indicadores, usada tanto pelo Dashboard quanto pela Home —
// as duas telas mostram os mesmos três números na mesma ordem, então mostram as
// mesmas três cores na mesma ordem.
//
// "Aprovado + pago" e "Pendentes" ficam com as cores que a rosca usa para aprovado
// e pendente: mesma entidade, mesma cor. "Solicitações" é um total, que não é
// status nenhum, e recebe `#A8DADC` por escolha visual — é a cor que a rosca dá a
// "pago", então aqui a cor NÃO carrega significado de status. Registrado porque a
// versão anterior tentava ser semântica nos três e caía numa colisão: o total e
// "Pendentes" acabavam ambos em `#1D3557`, dois cards da mesma cor lado a lado.
//
// Contraste medido (WCAG, contra o texto que readableTextOn escolhe): #A8DADC
// 9,64:1, #457B9D 4,59:1, #1D3557 12,36:1 — os três passam AA para texto normal.
export const KPI_TONES = {
  total: tone(PALETTE[2]),
  settled: tone(sliceColor(STATUS_SLICES, "approved")),
  pending: tone(sliceColor(STATUS_SLICES, "pending")),
} as const;

// A mesma sequência como lista, para a Home percorrer os cards na ordem sem
// repetir os nomes das chaves.
export const KPI_TONE_SEQUENCE = [
  KPI_TONES.total,
  KPI_TONES.settled,
  KPI_TONES.pending,
] as const;
