import i18next from "i18next";
import { DEFAULT_LOCALE } from "@/stores/ui";

// A moeda acompanha o locale ativo. Não é só formatação: BRL e USD são valores
// diferentes, então trocar o símbolo sem converter o valor seria mentir. O
// backend guarda centavos de real, então a moeda continua BRL nos dois idiomas;
// o que muda é a convenção de escrita (R$ 1.234,56 vs R$1,234.56).
function activeLocale(): string {
  return i18next.language || DEFAULT_LOCALE;
}

export function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString(activeLocale(), {
    style: "currency",
    currency: "BRL",
  });
}

// `created_at` é nullable no contrato (schemas/refund.ts), e uma data inválida
// não deve virar "Invalid Date" dentro de uma célula. O travessão é o mesmo
// símbolo usado como "sem valor" em tabelas.
export function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(activeLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}
