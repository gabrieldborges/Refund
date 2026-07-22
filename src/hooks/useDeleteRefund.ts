import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { refundKeys } from "./refundQueries";

export function useDeleteRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/refunds/${id}`);
    },
    // A lista da Home não deve mais mostrar o item excluído. refundKeys.all
    // (prefixo ["refunds"]) invalida todas as páginas/buscas da lista.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: refundKeys.all });
    },
  });
}
