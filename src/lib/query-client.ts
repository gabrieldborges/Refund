import { QueryClient } from "@tanstack/react-query";

// O QueryClient guarda o cache de server state e as políticas padrão de todas as
// queries. Antes ele era criado sem opções (staleTime 0), então qualquer dado já
// nascia "velho" e era refeito ao menor gatilho. Aqui as escolhas ficam explícitas.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Por 30s o dado é considerado "fresco": voltar para a Home ou remontar o
      // componente dentro desse tempo usa o cache, sem disparar nova requisição.
      staleTime: 30_000,
      // Em erro, tentar no máximo 1 vez a mais. Falha de credencial (401) já é
      // tratada no interceptor do Axios; aqui cobrimos só uma falha de rede pontual.
      retry: 1,
      // Não revalidar só porque o usuário trocou de aba do navegador e voltou.
      refetchOnWindowFocus: false,
    },
  },
});
