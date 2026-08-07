import { useQuery } from "@tanstack/react-query";
import { paymentReceiptQuery, receiptQuery } from "../api/refundQueries";

// Which file to fetch: the expense receipt the requester attached (UC-010) or
// the payment receipt an admin attached when marking the refund as paid
// (UC-012's sibling download). Same {url, media_type} shape, different endpoint and cache
// key — see paymentReceiptQuery/refundKeys.paymentReceipt in refundQueries.ts.
export type ReceiptKind = "expense" | "payment";

// Espelha useRefund: sem id (rota mal formada), a query fica desabilitada e a
// chave com "" nunca chega a virar requisição.
//
// As duas queries são chamadas incondicionalmente (Rules of Hooks não permite
// pular um useQuery com base em `kind`), mas só a que corresponde a `kind`
// fica habilitada — a outra nunca dispara requisição, só carrega o resultado
// "desabilitado para sempre" que useQuery já sabe representar. `queryOptions`
// tipa cada queryKey como uma tupla literal diferente ("receipt" vs.
// "payment-receipt"), então mesclar as duas num único objeto antes de chamar
// useQuery não tipa; devolver um UseQueryResult ou o outro tipa, porque esse
// tipo não carrega o formato da chave.
export function useReceipt(id: string | undefined, kind: ReceiptKind = "expense") {
  const expenseReceipt = useQuery({
    ...receiptQuery(id ?? ""),
    enabled: !!id && kind === "expense",
  });
  const paymentReceipt = useQuery({
    ...paymentReceiptQuery(id ?? ""),
    enabled: !!id && kind === "payment",
  });

  return kind === "payment" ? paymentReceipt : expenseReceipt;
}
