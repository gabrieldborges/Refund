import { useState, type ReactNode } from "react";
import { AuthContext, type AuthUser } from "./auth-context";
import { api, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "../lib/api";

interface LoginResponse {
  access: boolean;
  name: string;
  email: string;
  role: "standard" | "admin";
  token: string;
}

function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);

  // Se der erro, deixa o axios rejeitar a Promise — quem chama login() decide
  // como mostrar isso na tela (é responsabilidade de UI, não de sessão).
  async function login(email: string, password: string) {
    const { data } = await api.post<LoginResponse>("/auth/login", { email, password });
    const loggedUser: AuthUser = { name: data.name, email: data.email, role: data.role };
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
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
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
