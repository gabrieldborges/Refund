import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";

// Metade do TTL de 300s que o backend assina, como o comprovante já faz: uma URL
// guardada mais tempo que isso pode chegar à tela já vencida, e o sintoma seria uma
// imagem quebrada em vez de um erro que a UI saiba mostrar.
const SIGNED_URL_STALE_TIME_MS = 150_000;

const avatarUrlResponseSchema = z.object({
  url: z.string().url(),
  media_type: z.string(),
});

export const avatarKeys = {
  all: ["avatars"] as const,
  url: (userId: number) => [...avatarKeys.all, userId] as const,
};

export function avatarUrlQuery(userId: number) {
  return queryOptions({
    queryKey: avatarKeys.url(userId),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<unknown>(`/users/${userId}/avatar`, { signal });
      return avatarUrlResponseSchema.parse(data);
    },
    staleTime: SIGNED_URL_STALE_TIME_MS,
    gcTime: SIGNED_URL_STALE_TIME_MS,
    // Sem retry: a API responde 404 tanto para "usuário sem foto" quanto para
    // "usuário inexistente", e nos dois casos a resposta certa é mostrar as
    // iniciais. Repetir uma requisição que vai 404 de novo só atrasa o fallback.
    retry: false,
  });
}
