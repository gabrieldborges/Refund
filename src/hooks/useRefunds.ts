import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { RefundsListResponse } from "../types/refund";

interface UseRefundsParams {
  page: number;
  perPage?: number;
  name?: string;
}

export function useRefunds({ page, perPage = 6, name }: UseRefundsParams) {
  return useQuery({
    // A queryKey identifica esse resultado no cache do React Query — mudou
    // page/perPage/name, muda a chave, e ele sabe que precisa buscar de novo
    // (ou já ter em cache se essa combinação já foi pedida antes).
    queryKey: ["refunds", { page, perPage, name }],
    queryFn: async () => {
      const { data } = await api.get<RefundsListResponse>("/refunds", {
        params: { page, per_page: perPage, name: name || undefined },
      });
      return data;
    },
  });
}
