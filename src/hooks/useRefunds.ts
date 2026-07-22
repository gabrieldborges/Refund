import { useQuery } from "@tanstack/react-query";
import { refundListQuery } from "./refundQueries";

interface UseRefundsParams {
  page: number;
  perPage?: number;
  name?: string;
}

// perPage tem default 6 aqui porque é uma decisão de UI (quantos itens a Home
// mostra), não do contrato da query. A chave e a função de busca vivem em
// refundListQuery, reaproveitáveis por outros consumidores (ex.: loader no Item 3).
export function useRefunds({ page, perPage = 6, name }: UseRefundsParams) {
  return useQuery(refundListQuery({ page, perPage, name }));
}
