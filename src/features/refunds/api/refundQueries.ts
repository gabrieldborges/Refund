import { queryOptions } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { refundDetailResponseSchema, refundsListResponseSchema } from "../schemas/refund";

interface RefundListParams {
  page: number;
  perPage: number;
  name?: string;
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
        params: { page: params.page, per_page: params.perPage, name: params.name || undefined },
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
      return refundDetailResponseSchema.parse(data).attributes;
    },
  });
}
