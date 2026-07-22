import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { refundKeys } from "./refundQueries";
import type { RefundCreateFormData } from "../schemas/refund";
import type { Refund } from "../types/refund";

export function useCreateRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RefundCreateFormData) => {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("category", data.category);
      formData.append("amount", String(data.amount));
      formData.append("file", data.file[0]);

      const response = await api.post<{ attributes: Refund }>("/refunds", formData);
      return response.data.attributes;
    },
    // O cache da Home fica desatualizado assim que um reembolso novo é criado —
    // invalidateQueries diz ao React Query "da próxima vez que alguém pedir esses
    // dados, busque de novo, não use o que já está guardado". refundKeys.all é o
    // prefixo ["refunds"], então isso atinge todas as páginas/buscas da lista.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: refundKeys.all });
    },
  });
}
