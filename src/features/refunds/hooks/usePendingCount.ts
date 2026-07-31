import { useQuery } from "@tanstack/react-query";
import { refundListQuery } from "../api/refundQueries";

// Quantas solicitações estão pendentes NO TOTAL — nunca a página atual, nunca
// o filtro ativo. Pede uma página de UMA linha e lê só o `total`, que a API
// calcula sobre o conjunto inteiro (UC-004); o corpo vem praticamente vazio.
//
// Só o admin precisa disto. Um usuário comum já recebe a própria contagem em
// GET /users/{id}/refund-stats, que por ser por usuário já ignora filtro e
// paginação — daí o `enabled`.
export function usePendingCount(enabled: boolean) {
  const { data, isLoading, isError } = useQuery({
    ...refundListQuery({ page: 1, perPage: 1, status: "pending" }),
    enabled,
  });

  return { count: data?.total, isLoading: enabled && isLoading, isError };
}
