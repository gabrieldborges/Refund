import { useQuery } from "@tanstack/react-query";
import { avatarUrlQuery } from "../api/avatarQueries";

// `hasAvatar` decide se a requisição acontece:
//   false     -> não busca. É o caso da lista de Time, onde 10 linhas sem foto
//                seriam 10 requisições que respondem 404.
//   true      -> busca.
//   undefined -> busca. É o caso da sidebar: a sessão gravada não guarda
//                `has_avatar`, então a única forma de saber é perguntar. Uma
//                requisição por sessão, servida do cache depois.
export function useAvatarUrl(userId: number | undefined, hasAvatar?: boolean) {
  return useQuery({
    ...avatarUrlQuery(userId ?? 0),
    enabled: !!userId && hasAvatar !== false,
  });
}
