import { useQuery } from "@tanstack/react-query";
import { refundListQuery } from "../api/refundQueries";
import { REFUNDS_PER_PAGE } from "../constants/pagination";
import type { RefundOrder, RefundSort, RefundStatus } from "../schemas/refund";

interface UseRefundsParams {
  page: number;
  perPage?: number;
  name?: string;
  // Scopes the list to one requester's refunds (RequesterPanel, Task 9).
  userId?: number;
  // Filtro e ordenação server-side (UC-004). Nunca ordenamos no cliente: ele
  // só tem a página atual, e ordenar 10 de N linhas parece funcionar.
  status?: RefundStatus;
  sort?: RefundSort;
  order?: RefundOrder;
}

// O default vem da constante compartilhada com o loader: até este ciclo o
// número estava escrito nos dois lugares, e mudar só um deixava loader e hook
// pedindo páginas de tamanhos diferentes.
//
// Coincidência a preservar: homeLoader (router-loaders.ts) monta a chave de
// query como {page, perPage, name, status, sort, order}, sem `userId`; este
// hook monta a mesma chave MAIS `userId: undefined`. As duas só colidem
// porque `hashKey` do React Query ordena as chaves e `JSON.stringify` descarta
// propriedades com valor `undefined` — então o prefetch do loader é
// reaproveitado aqui só por isso. Se `userId` algum dia virasse `null` em vez
// de `undefined` para "sem filtro", essa coincidência quebraria e o hook
// deixaria de reaproveitar o prefetch do loader.
export function useRefunds({
  page,
  perPage = REFUNDS_PER_PAGE,
  name,
  userId,
  status,
  sort,
  order,
}: UseRefundsParams) {
  return useQuery(refundListQuery({ page, perPage, name, userId, status, sort, order }));
}
