import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { refundKeys } from "../api/refundQueries";
import type { PayRefundFormData } from "../schemas/refund";

interface PayRefundInput {
  id: string;
  file: PayRefundFormData["file"];
}

export function usePayRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: PayRefundInput) => {
      const formData = new FormData();
      formData.append("file", file[0]);

      // The response body is ignored on purpose, same reasoning as
      // useReviewRefund: UC-012 does re-read the row through the shared
      // `serialize_refund`, but the review screen already refetches the
      // refund's own detail query below, so parsing this body would just be a
      // second source of the same data.
      await api.post(`/refunds/${id}/payment`, formData);
    },
    // Same target and reasoning as useReviewRefund: the review screen owns
    // the detail query of the refund being paid, and the Home list is
    // inactive while here. refundKeys.all (not just .lists()) covers both,
    // and refetchType: "all" forces the refetch even without an active
    // observer on the list.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: refundKeys.all, refetchType: "all" });
    },
  });
}
