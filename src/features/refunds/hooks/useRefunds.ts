import { useQuery } from "@tanstack/react-query";
import { refundListQuery } from "../api/refundQueries";
import { REFUNDS_PER_PAGE } from "../constants/pagination";

interface UseRefundsParams {
  page: number;
  perPage?: number;
  name?: string;
}

// O default vem da constante compartilhada com o loader: até este ciclo o
// número estava escrito nos dois lugares, e mudar só um deixava loader e hook
// pedindo páginas de tamanhos diferentes.
export function useRefunds({ page, perPage = REFUNDS_PER_PAGE, name }: UseRefundsParams) {
  return useQuery(refundListQuery({ page, perPage, name }));
}
