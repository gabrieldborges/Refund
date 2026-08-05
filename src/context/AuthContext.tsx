import { useState, type ReactNode } from "react";
import { AuthContext, type AuthUser } from "./auth-context";
import { api, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "../lib/api";
import { loginResponseSchema, storedUserSchema } from "../schemas/auth";
import { queryClient } from "@/lib/query-client";

// safeParse em vez de parse: uma sessão inválida (de antes do `id`, ou
// corrompida) deve derrubar a sessão, não a aplicação inteira no primeiro
// render.
function loadStoredUser(): AuthUser | null {
  try {
    // O getItem fica DENTRO do try: acessar localStorage joga quando o
    // navegador bloqueia dados do site (configuração de privacidade, política
    // corporativa). Como isto roda no inicializador do useState, uma exceção
    // aqui acontece durante o render — antes, derrubava a aplicação inteira.
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;

    const result = storedUserSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    // JSON.parse joga em texto corrompido; o safeParse nunca chegaria a rodar.
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);

  // Se der erro, deixa o axios rejeitar a Promise — quem chama login() decide
  // como mostrar isso na tela (é responsabilidade de UI, não de sessão).
  async function login(email: string, password: string) {
    const { data } = await api.post<unknown>("/auth/login", { email, password });
    const loginResponse = loginResponseSchema.parse(data);
    const loggedUser: AuthUser = {
      id: loginResponse.id,
      name: loginResponse.name,
      email: loginResponse.email,
      role: loginResponse.role,
    };
    localStorage.setItem(TOKEN_STORAGE_KEY, loginResponse.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedUser));
    setUser(loggedUser);
  }

  // Não loga automaticamente — espelha o backend real (POST /auth/register
  // não devolve token, só POST /auth/login devolve).
  async function register(name: string, email: string, password: string) {
    await api.post("/auth/register", { name, email, password });
  }

  function logout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    // O cache do React Query agora guarda estado por sessão — incluindo os
    // bytes do Blob do comprovante que o usuário atual viu. Sem isso, o
    // staleTime/gcTime deixam esse cache sobreviver ao logout: se outro
    // usuário logar na mesma aba dentro da janela, os loaders e o useReceipt
    // serviriam dados (e o Blob) de quem saiu.
    queryClient.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
