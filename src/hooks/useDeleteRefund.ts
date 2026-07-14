import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useDeleteRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/refunds/${id}`);
    },
    // A lista da Home (chave "refunds") não deve mais mostrar o item excluído.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
    },
  });
}
