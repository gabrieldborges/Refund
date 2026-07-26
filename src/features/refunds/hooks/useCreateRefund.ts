import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { refundKeys } from "../api/refundQueries";
import { refundCreateResponseSchema, type RefundCreateFormData } from "../schemas/refund";

export function useCreateRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RefundCreateFormData) => {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("category", data.category);
      formData.append("amount", String(data.amount));
      formData.append("file", data.file[0]);

      const { data: responseData } = await api.post<unknown>("/refunds", formData);
      return refundCreateResponseSchema.parse(responseData).attributes;
    },
    // O cache da Home fica desatualizado assim que um reembolso novo é criado.
    // Mesmo alvo do useDeleteRefund: refundKeys.lists() (só as listas) com
    // refetchType: "all", que refaz também as listas inativas e mantém a
    // consistência sem tocar em nenhuma query de detalhe.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: refundKeys.lists(), refetchType: "all" });
    },
  });
}
