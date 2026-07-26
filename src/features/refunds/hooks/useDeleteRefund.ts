import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { refundKeys } from "../api/refundQueries";

export function useDeleteRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/refunds/${id}`);
    },
    // A lista da Home não deve mais mostrar o item excluído.
    // Dois cuidados aqui:
    // 1) Alvo refundKeys.lists() (só as listas), NÃO refundKeys.all — porque a
    //    exclusão parte da página de detalhe, cuja query (do item apagado) está
    //    ativa. Invalidar o detalhe faria um GET de algo que não existe mais.
    // 2) refetchType: "all" porque, ao excluir do detalhe, a lista da Home está
    //    INATIVA. O padrão ("active") só refaz queries ativas — a lista inativa
    //    ficaria só marcada como velha e, por causa do staleTime de 30s, não
    //    seria refeita na próxima montagem. "all" força o refetch mesmo inativa.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: refundKeys.lists(), refetchType: "all" });
    },
  });
}
