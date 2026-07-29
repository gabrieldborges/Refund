import axios from "axios";

export const TOKEN_STORAGE_KEY = "refund:token";
export const USER_STORAGE_KEY = "refund:user";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Roda antes de toda requisição: anexa o token salvo no login, se existir.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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

// O backend devolve erro de duas formas: uma string ({"detail": "..."})
// quando é uma regra de negócio nossa, ou uma lista de objetos de validação
// do próprio FastAPI ({"detail": [{"msg": "...", ...}]}) quando o corpo da
// requisição nem chegou a ser processado pelo nosso código. Essa função
// entende os dois formatos e sempre devolve uma mensagem exibível.
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail) && typeof detail[0]?.msg === "string") {
      return detail[0].msg;
    }
  }
  return "Algo deu errado. Tente novamente.";
}
