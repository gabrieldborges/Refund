// Uma escala de valor tem duas partes: o divisor que torna os números do eixo
// legíveis, e o rótulo que diz o que eles significam. As duas juntas, porque
// separá-las é como se produz um eixo mostrando "340" sem nada dizendo se são
// reais, milhares ou milhões.
export interface ValueScale {
  // Divide CENTAVOS para chegar ao número do eixo.
  divisor: number;
  // Chave de catálogo do rótulo ("em reais", "em milhares de reais"…).
  unitLabelKey: string;
}

const CENTS_PER_REAL = 100;

// A unidade acompanha a magnitude em vez de ser fixa em milhares. Uma escala fixa
// funciona bem com números grandes e mente com números pequenos: com R$ 1.878 no
// total, um eixo em milhares mostraria 2, e cada categoria abaixo de R$ 500
// apareceria como 0 — indistinguível de categoria sem nenhuma solicitação.
//
// O corte é pelo MAIOR valor da série, não por valor: todos os pontos precisam
// compartilhar a mesma unidade, senão o eixo deixa de ser comparável.
export function valueScaleFor(centsValues: readonly number[]): ValueScale {
  const maxCents = centsValues.length ? Math.max(...centsValues) : 0;
  const reais = maxCents / CENTS_PER_REAL;

  if (reais >= 1_000_000) {
    return { divisor: CENTS_PER_REAL * 1_000_000, unitLabelKey: "chart.unitMillions" };
  }
  if (reais >= 10_000) {
    // O corte é 10 mil, e não mil: a partir daí o eixo em milhares tem pelo menos
    // duas casas significativas (10, 25, 340). Entre mil e dez mil, milhares
    // produziria 1, 2, 3 — perda de resolução sem ganho de legibilidade.
    return { divisor: CENTS_PER_REAL * 1_000, unitLabelKey: "chart.unitThousands" };
  }
  return { divisor: CENTS_PER_REAL, unitLabelKey: "chart.unitReais" };
}

// O número do eixo: inteiro, sempre. O rótulo acima do gráfico é o que carrega a
// unidade, então repetir "R$" em cada marca do eixo seria ruído.
export function scaleValue(cents: number, scale: ValueScale): number {
  return Math.round(cents / scale.divisor);
}
