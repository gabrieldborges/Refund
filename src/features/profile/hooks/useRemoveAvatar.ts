import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { avatarKeys } from "../api/avatarQueries";

export function useRemoveAvatar(userId: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete("/users/me/avatar");
    },
    onSuccess: () => {
      // removeQueries e não invalidate: depois de remover, a URL guardada aponta
      // para um arquivo que não existe mais. Invalidar rebuscaria e receberia 404;
      // remover deixa o componente cair direto nas iniciais.
      if (userId) queryClient.removeQueries({ queryKey: avatarKeys.url(userId) });
      return queryClient.invalidateQueries({ queryKey: avatarKeys.all });
    },
  });
}
