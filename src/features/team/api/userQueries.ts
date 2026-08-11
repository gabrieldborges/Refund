import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { userListResponseSchema, userResponseSchema } from "../schemas/user";

interface UserListParams {
  page: number;
  perPage: number;
  name?: string;
}

// Fonte única das chaves de cache do diretório. Tudo deriva de `all`, então as
// chaves são hierárquicas: invalidar userKeys.all atinge lista E detalhe de uma
// vez, porque o React Query casa chaves por prefixo. Mesmo arranjo de
// refundKeys.
export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (params: UserListParams) => [...userKeys.lists(), params] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
};

export function userListQuery(params: UserListParams) {
  return queryOptions({
    queryKey: userKeys.list(params),
    // O signal vem do React Query e vai para o axios: uma busca que muda no
    // meio do caminho cancela a requisição anterior em vez de deixá-la chegar
    // depois e sobrescrever o resultado novo.
    queryFn: async ({ signal }) => {
      const { data } = await api.get<unknown>("/users", {
        params: {
          page: params.page,
          per_page: params.perPage,
          // Omitido em vez de enviado vazio, para a chave de cache e a
          // requisição concordarem sobre o que é "sem busca".
          name: params.name || undefined,
        },
        signal,
      });
      // Zod na fronteira: a resposta é `unknown` até passar por aqui.
      return userListResponseSchema.parse(data);
    },
  });
}

export function userDetailQuery(id: string) {
  return queryOptions({
    queryKey: userKeys.detail(id),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<unknown>(`/users/${id}`, { signal });
      // Devolve já desembrulhado: o envelope {type, count} não interessa a
      // nenhuma tela, e desembrulhar aqui evita `.attributes` espalhado.
      return userResponseSchema.parse(data).attributes;
    },
  });
}
