import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { refundKeys } from "./refundQueries";
import { refundSummaryResponseSchema } from "../schemas/summary";

// Sob o prefixo ["refunds"] como as demais, então invalidar refundKeys.all depois
// de criar ou revisar uma solicitação alcança o resumo também — que é o
// comportamento desejado: o agregado muda quando uma solicitação muda.
//
// A janela entra na chave: 6 meses e 12 meses são respostas diferentes e não
// podem compartilhar entrada de cache.
export function summaryKey(months: number) {
  return [...refundKeys.all, "summary", months] as const;
}

export function refundSummaryQuery(months: number) {
  return queryOptions({
    queryKey: summaryKey(months),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<unknown>("/refunds/summary", {
        params: { months },
        signal,
      });
      return refundSummaryResponseSchema.parse(data);
    },
  });
}
