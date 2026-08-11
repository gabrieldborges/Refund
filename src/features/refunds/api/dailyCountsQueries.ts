import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { refundKeys } from "./refundQueries";
import { refundDailyCountsResponseSchema } from "../schemas/dailyCounts";

// Sob o prefixo ["refunds"] como as demais, então criar ou revisar uma solicitação
// invalida a contagem do calendário junto — que é o desejado: a contagem muda quando
// uma solicitação muda.
export function dailyCountsKey(month: string) {
  return [...refundKeys.all, "daily-counts", month] as const;
}

export function refundDailyCountsQuery(month: string) {
  return queryOptions({
    queryKey: dailyCountsKey(month),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<unknown>("/refunds/daily-counts", {
        params: { month },
        signal,
      });
      return refundDailyCountsResponseSchema.parse(data);
    },
  });
}
