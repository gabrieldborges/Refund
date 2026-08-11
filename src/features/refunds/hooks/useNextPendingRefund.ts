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

  // A fila revisável, na ordem em que se trabalha nela. As solicitações do próprio
  // admin saem por BR-016 — via `canReviewRefund` (getRefundHref.ts), a única
  // implementação da regra; reescrever a condição aqui seria a segunda cópia que o
  // comentário de lá avisa para não criar.
  const queue = (data?.attributes ?? []).filter((refund) => canReviewRefund(refund, viewer));

  // "Próxima" é a SEGUINTE À ATUAL na fila, não "a primeira que não é a atual".
  //
  // A diferença não é sutil: com a fila [B, C, D] e a versão antiga, estando em B ela
  // devolvia C, e estando em C devolvia B — porque B é a primeira e não é a atual.
  // O botão ficava em pingue-pongue entre duas solicitações, que por serem vizinhas
  // na fila normalmente eram do mesmo solicitante. Era exatamente esse o sintoma
  // relatado.
  //
  // -1 quando a solicitação aberta não está na fila (ela não é pendente, ou é do
  // próprio admin): aí a próxima é a mais antiga, que é o começo da fila.
  const currentIndex = queue.findIndex((refund) => refund.id === currentRefundId);
  const nextRefund: Refund | null = queue[currentIndex + 1] ?? null;

  return { nextRefund, isLoading };
}
