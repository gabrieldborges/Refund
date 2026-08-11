import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { avatarKeys } from "../api/avatarQueries";

export function useUploadAvatar(userId: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append("file", file);
      await api.post("/users/me/avatar", body);
    },
    // A promessa é DEVOLVIDA do onSuccess, para o `isPending` cobrir também a
    // rebusca — senão o diálogo fecha antes de a imagem nova estar no cache e a
    // pessoa vê a antiga por um instante.
    //
    // `avatarKeys.all` e não só a chave deste usuário: a mesma pessoa aparece na
    // sidebar, na lista de Time e no painel do solicitante, e todas leem do mesmo
    // ramo.
    onSuccess: () => {
      if (userId) queryClient.removeQueries({ queryKey: avatarKeys.url(userId) });
      return queryClient.invalidateQueries({ queryKey: avatarKeys.all, refetchType: "all" });
    },
  });
}
