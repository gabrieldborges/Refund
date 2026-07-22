import { useQuery } from "@tanstack/react-query";
import { refundDetailQuery } from "./refundQueries";

export function useRefund(id: string | undefined) {
  return useQuery({
    ...refundDetailQuery(id ?? ""),
    // Sem id (rota mal formada), nem tenta buscar. Como a query fica desabilitada,
    // a chave com "" nunca chega a ser usada numa requisição.
    enabled: !!id,
  });
}
