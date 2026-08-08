import i18next from "i18next";
import { DEFAULT_LOCALE } from "@/stores/ui";
import axios from "axios";

export const TOKEN_STORAGE_KEY = "refund:token";
export const USER_STORAGE_KEY = "refund:user";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Roda antes de toda requisição: anexa o token salvo no login, se existir, e
// declara o idioma ativo. O backend hoje **ignora** o Accept-Language — todas
// as mensagens dele são em inglês e nenhuma é exibida ao usuário (o frontend
// tem as próprias). O header é preparação deliberada, não efeito imediato: no
// dia em que a API traduzir algo, o cliente já diz o que quer.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["Accept-Language"] = i18next.language || DEFAULT_LOCALE;
  return config;
});

// Roda depois de toda resposta: um 401 significa token ausente/expirado —
// nesse ponto qualquer rota protegida já é inacessível, então limpamos a
// sessão e mandamos direto pro login em vez de deixar a tela quebrada.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// O backend fala RFC 9457 (Problem Details) desde o Item 23: TODO erro chega
// como {type, title, status, detail, instance, request_id}, servido como
// application/problem+json. O `detail` é sempre uma string.
//
// Esta função tinha um segundo ramo, para quando a validação do próprio
// FastAPI devolvia `detail` como LISTA de objetos. Esse formato deixou de
// existir — os erros por campo agora vêm na extensão `errors`, e o `detail`
// virou uma frase como em qualquer outro erro. O ramo foi removido por estar
// morto, não por ter deixado de ser necessário: mantê-lo sugeriria que a API
// ainda pode responder daquele jeito.
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
  }
  return "Algo deu errado. Tente novamente.";
}

// O id que correlaciona o erro que o usuário viu com o log do servidor. Ainda
// não é mostrado em tela — quem quiser exibi-lo num 500 tem isto pronto, e o
// Item 24 é quem coloca o mesmo id nos logs.
export function getApiRequestId(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const requestId = error.response?.data?.request_id;
    if (typeof requestId === "string") {
      return requestId;
    }
  }
  return undefined;
}
