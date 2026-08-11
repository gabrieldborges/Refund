import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { refundKeys } from "./refundQueries";
import { refundSummaryResponseSchema } from "../schemas/summary";

// Sob o prefixo ["refunds"] como as demais, então invalidar refundKeys.all depois
// de criar ou revisar uma solicitação alcança o resumo também — que é o
// comportamento desejado: o agregado muda quando uma solicitação muda.
//
// O ano entra na chave: 2025 e 2026 são respostas diferentes e não podem
// compartilhar entrada de cache. `undefined` é uma chave válida e distinta — ela é
// "o ano que o servidor escolher".
export function summaryKey(year: number | undefined) {
  return [...refundKeys.all, "summary", year ?? "current"] as const;
}

export function refundSummaryQuery(year: number | undefined) {
  return queryOptions({
    queryKey: summaryKey(year),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<unknown>("/refunds/summary", {
        // Omitido quando ausente, para o servidor aplicar o ano corrente.
        params: year ? { year } : undefined,
        signal,
      });
      return refundSummaryResponseSchema.parse(data);
    },
  });
}
