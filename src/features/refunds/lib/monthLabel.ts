// "2026-03" -> "mar." no locale ativo. Só o mês, porque o ano vive no título do
// card: repeti-lo em cada marca do eixo gastaria a largura que falta no mobile
// exatamente com a informação que não muda entre as marcas.
export function monthLabel(month: string, locale: string): string {
  const [, monthNumber] = month.split("-");
  // Dia 1 e meio-dia: construir a data com o dia 1 evita o mês "pular" em fusos a
  // oeste, e o meio-dia dá folga de 12 horas para qualquer deslocamento.
  const date = new Date(2000, Number(monthNumber) - 1, 1, 12);
  return new Intl.DateTimeFormat(locale, { month: "short" }).format(date);
}

// O ano de um "YYYY-MM", para o título do card.
export function yearOf(month: string): string {
  return month.split("-")[0];
}

// Quais marcas o eixo mostra. Doze rótulos não cabem numa tela de 390px: eles
// colidem ou o Nivo os corta, e um eixo com rótulos cortados é pior que um eixo
// com metade dos rótulos. No mobile mostramos um mês a cada dois — a série
// continua inteira, só a rotulagem rareia.
export function visibleMonthTicks(months: readonly string[], isMobile: boolean): string[] {
  if (!isMobile) return [...months];
  return months.filter((_, index) => index % 2 === 0);
}
