import { useQuery } from "@tanstack/react-query";
import { receiptQuery } from "../api/refundQueries";

// Espelha useRefund: sem id (rota mal formada), a query fica desabilitada e a
// chave com "" nunca chega a virar requisição.
export function useReceipt(id: string | undefined) {
  return useQuery({
    ...receiptQuery(id ?? ""),
    enabled: !!id,
  });
}
