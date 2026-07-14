import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Refund } from "../types/refund";

export function useRefund(id: string | undefined) {
  return useQuery({
    queryKey: ["refunds", id],
    queryFn: async () => {
      const { data } = await api.get<{ attributes: Refund }>(`/refunds/${id}`);
      return data.attributes;
    },
    // Sem id (rota mal formada), nem tenta buscar.
    enabled: !!id,
  });
}
