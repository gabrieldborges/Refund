import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Metade do TTL de 300s que o backend assina. Uma URL guardada mais tempo que
// isso pode chegar à tela já vencida — e o sintoma seria uma imagem quebrada,
// não um erro que a UI saiba mostrar.
const SIGNED_URL_STALE_TIME_MS = 150_000;
import {
  fileUrlResponseSchema,
  refundResponseSchema,
  refundsListResponseSchema,
} from "../schemas/refund";
import type { RefundOrder, RefundSort, RefundStatus } from "../schemas/refund";

interface RefundListParams {
  page: number;
  perPage: number;
  name?: string;
  // Scopes the list to one requester (GET /refunds?user_id=). Only an admin's
  // request is actually restricted by it — UC-004 says the API ignores the
  // param for a standard user, whose scope is already fixed to their own
  // token — so passing it is safe by construction; no new error path exists.
  userId?: number;
  // Filtro e ordenação server-side (UC-004). Nunca ordenamos no cliente: ele
  // só tem a página atual, e ordenar 10 de N linhas parece funcionar.
  status?: RefundStatus;
  sort?: RefundSort;
  order?: RefundOrder;
}

// Fonte única das chaves de cache dos reembolsos. Tudo deriva de `all`, então as
// chaves são hierárquicas: invalidar `refundKeys.all` (["refunds"]) atinge lista
// E detalhe de uma vez, porque o React Query casa chaves por prefixo.
export const refundKeys = {
  all: ["refunds"] as const,
  // Prefixo só das listas (["refunds", "list"]). Serve para invalidar todas as
  // páginas/buscas SEM atingir o detalhe — importante ao excluir: não queremos
  // rebuscar o detalhe de um item que acabou de ser apagado.
  lists: () => [...refundKeys.all, "list"] as const,
  list: (params: RefundListParams) => [...refundKeys.lists(), params] as const,
  detail: (id: string) => [...refundKeys.all, "detail", id] as const,
  // O comprovante de um reembolso. Fica sob o prefixo ["refunds"] como os
  // demais, mas NÃO é invalidado na exclusão: useDeleteRefund mira
  // refundKeys.lists() justamente para não rebuscar o que acabou de sumir, e
  // o comprovante segue a mesma regra.
  receipt: (id: string) => [...refundKeys.all, "receipt", id] as const,
  // O comprovante de PAGAMENTO (UC-012), um arquivo distinto do de despesa
  // acima — endpoint próprio (`/payment-receipt`), só passa a existir depois
  // que o admin marca a solicitação como paga. Mesma regra do `receipt`: nem
  // useDeleteRefund nem useCreateRefund tocam este ramo, os dois miram só
  // refundKeys.lists(). usePayRefund é a exceção — invalida refundKeys.all
  // inteiro, o que alcança esta chave também, e faz sentido: é exatamente o
  // pagamento que faz esse arquivo passar a existir.
  paymentReceipt: (id: string) => [...refundKeys.all, "payment-receipt", id] as const,
  // Per-user stats (counts/sums grouped by status). Keyed by userId because
  // an admin can read another user's stats, so different users must not
  // share a cache entry.
  stats: (userId: number) => [...refundKeys.all, "stats", userId] as const,
  // A refund's full decision history (UC-013). Own subtree under
  // ["refunds"] rather than nested under detail(id): it is a distinct
  // resource (GET /refunds/{id}/reviews), not a field of the refund itself.
  reviews: (id: string) => [...refundKeys.all, "reviews", id] as const,
};

// queryOptions empacota { queryKey, queryFn } num objeto tipado e reutilizável.
// O hook consome isso hoje; no Item 3 o loader do router vai reusar o MESMO
// objeto, garantindo que prefetch e render usem a mesma chave e função.
export function refundListQuery(params: RefundListParams) {
  return queryOptions({
    queryKey: refundKeys.list(params),
    // `signal` vem do React Query: se a query for cancelada (parâmetros mudaram,
    // componente desmontou), o Axios aborta a requisição em vez de terminá-la à toa.
    queryFn: async ({ signal }) => {
      const { data } = await api.get<unknown>("/refunds", {
        params: {
          page: params.page,
          per_page: params.perPage,
          name: params.name || undefined,
          user_id: params.userId,
          status: params.status,
          sort: params.sort,
          order: params.order,
        },
        signal,
      });
      return refundsListResponseSchema.parse(data);
    },
  });
}

export function refundDetailQuery(id: string) {
  return queryOptions({
    queryKey: refundKeys.detail(id),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<unknown>(`/refunds/${id}`, { signal });
      return refundResponseSchema.parse(data).attributes;
    },
  });
}

// Item 22: devolve uma URL assinada, não os bytes. Isso passou a ser JSON,
// então voltou a ter Zod como todas as outras — o motivo que isentava esta
// query ("a resposta é binária") deixou de existir.
//
// O que é cacheado agora é a URL, e ela EXPIRA (FILE_URL_TTL_SECONDS no
// backend, 300s). Daí o staleTime abaixo, menor que o TTL: sem ele o TanStack
// serviria por 30s (o default global) uma URL que pode estar a segundos de
// vencer, e a imagem quebraria na tela sem erro nenhum na camada de dados.
export function receiptQuery(id: string) {
  return queryOptions({
    queryKey: refundKeys.receipt(id),
    queryFn: async ({ signal }) => {
      const response = await api.get<unknown>(`/refunds/${id}/receipt`, { signal });
      return fileUrlResponseSchema.parse(response.data);
    },
    staleTime: SIGNED_URL_STALE_TIME_MS,
    gcTime: SIGNED_URL_STALE_TIME_MS,
  });
}

// Sibling of receiptQuery for UC-012's payment-receipt endpoint: same shape,
// same "binary body, no Zod" reasoning above, just a different path and cache
// key. All four failure modes (unknown id, someone else's refund, a refund
// never paid, a file missing from disk) answer the same 404 — the query
// surfaces that as a single isError, exactly like receiptQuery.
export function paymentReceiptQuery(id: string) {
  return queryOptions({
    queryKey: refundKeys.paymentReceipt(id),
    queryFn: async ({ signal }) => {
      const response = await api.get<unknown>(`/refunds/${id}/payment-receipt`, { signal });
      return fileUrlResponseSchema.parse(response.data);
    },
    staleTime: SIGNED_URL_STALE_TIME_MS,
    gcTime: SIGNED_URL_STALE_TIME_MS,
  });
}
