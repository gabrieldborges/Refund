import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { refundKeys } from "../api/refundQueries";

interface ReviewRefundInput {
  id: string;
  status: "approved" | "rejected";
  // Só a rejeição exige motivo (UC-007); a aprovação nunca envia este campo.
  reason?: string;
}

export function useReviewRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, reason }: ReviewRefundInput) => {
      // O corpo da resposta é deliberadamente ignorado: PATCH /refunds/{id}/status
      // devolve um formato divergente das demais respostas de reembolso
      // (`user_id` no topo, sem `user` aninhado, e `filename` exposto) — decisão
      // registrada no UC-007. Refazer o GET (via invalidação abaixo) evita dar
      // um contrato próprio a esse formato só para este fluxo.
      await api.patch(`/refunds/${id}/status`, { status, reason });
    },
    // Mesmo raciocínio do useDeleteRefund, mas mirando refundKeys.all (não só
    // .lists()): a tela de revisão parte do detalhe do PRÓPRIO reembolso
    // revisado, então tanto a lista da Home quanto o detalhe (se houver alguém
    // olhando) precisam refletir o novo status — ao contrário da exclusão, o
    // item revisado continua existindo, só muda de estado. A Home fica
    // INATIVA enquanto se revisa, e o refetchType padrão ("active") deixaria
    // sua lista velha por até o staleTime; "all" força o refetch mesmo assim.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: refundKeys.all, refetchType: "all" });
    },
  });
}
