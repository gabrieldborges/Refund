import { useQuery } from "@tanstack/react-query";
import { refundListQuery } from "../api/refundQueries";
import { REFUNDS_PER_PAGE } from "../constants/pagination";
import { canReviewRefund, type RefundViewer } from "../lib/getRefundHref";
import type { Refund } from "../schemas/refund";

// A fila de trabalho do admin: a pendente MAIS ANTIGA primeiro. O padrão da
// API é `created_at desc`, que numa fila faria as solicitações velhas nunca
// saírem — daí o `order: "asc"` explícito.
//
// Limitação consciente: só a primeira página é consultada. Se as 10 pendentes
// mais antigas forem todas do próprio admin, o botão desabilita mesmo havendo
// outras adiante. Varrer páginas até achar custa mais do que o caso raro vale.
//
// Coincidência a preservar: com `status: "pending"` e `order: "asc"`, esta
// query tem a MESMA chave de cache e a MESMA requisição HTTP que a Home em
// `?status=pending&order=asc` — por isso é correto compartilhar uma entrada
// de cache com ela. Se um dos dois lados ganhar `select`, `staleTime` ou
// `placeholderData` diferente do outro, essa coincidência quebra e os dois
// passam a disputar a mesma entrada silenciosamente.
export function useNextPendingRefund(currentRefundId: number, viewer: RefundViewer | null) {
  const isAdmin = viewer?.role === "admin";

  const { data, isLoading } = useQuery({
    ...refundListQuery({
      page: 1,
      perPage: REFUNDS_PER_PAGE,
      status: "pending",
      sort: "created_at",
      order: "asc",
    }),
    enabled: isAdmin,
  });

  // Duas exclusões, por motivos diferentes: a atual porque "próxima" precisa
  // ser outra tela, e as do próprio admin por BR-016 — delegada a
  // `canReviewRefund` (getRefundHref.ts), a única implementação da regra.
  // Reescrever a condição aqui seria a segunda cópia que o comentário de lá
  // avisa para não criar.
  const nextRefund: Refund | null =
    data?.attributes.find(
      (refund) => refund.id !== currentRefundId && canReviewRefund(refund, viewer)
    ) ?? null;

  return { nextRefund, isLoading };
}
