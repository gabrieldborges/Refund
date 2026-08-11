import { useQuery } from "@tanstack/react-query";
import { userDetailQuery } from "../api/userQueries";

export function useUser(id: string | undefined) {
  // `enabled` em vez de um early return: o hook precisa ser chamado sempre, e
  // sem id não há requisição a fazer. Mesmo arranjo de useRefundStats.
  return useQuery({ ...userDetailQuery(id ?? ""), enabled: !!id });
}
