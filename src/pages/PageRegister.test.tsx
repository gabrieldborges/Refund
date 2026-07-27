import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import PageRegister from "./PageRegister";
import { AuthContext } from "../context/auth-context";
import type { AuthContextValue } from "../context/auth-context";

// Builds an AuthContext value whose `register` is the provided spy. The
// register flow is exercised without any network: we mock the boundary the
// real app calls (`register`), which is exactly what MSW will replace in Item 5.
function authValueWithRegister(register: AuthContextValue["register"]): AuthContextValue {
  return {
    user: null,
    isAuthenticated: false,
    login: async () => {},
    register,
    logout: () => {},
  };
}

// Renders PageRegister at "/register" alongside a "/login" marker route, so a
// successful register (which calls navigate("/login")) can be observed as a
// route change.
function renderRegister(register: AuthContextValue["register"]) {
  render(
    <AuthContext.Provider value={authValueWithRegister(register)}>
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<PageRegister />} />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("PageRegister", () => {
  // Submitting with every field empty should surface all three Zod messages
  // and never call register() — the resolver blocks submission before it runs.
  it("shows validation messages for empty fields and blocks the register call", async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue(undefined);
    renderRegister(register);

    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText("Nome é obrigatório")).toBeInTheDocument();
    expect(screen.getByText("E-mail é obrigatório")).toBeInTheDocument();
    expect(screen.getByText("Senha deve ter ao menos 6 caracteres")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  // Happy path: typing valid data and submitting calls register with
  // (name, email, password) in that order, and navigates to /login.
  it("submits the data and navigates to login on success", async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue(undefined);
    renderRegister(register);

    await user.type(screen.getByLabelText("Nome"), "Ana Souza");
    await user.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await user.type(screen.getByLabelText("Senha"), "secret123");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(register).toHaveBeenCalledWith("Ana Souza", "ana@exemplo.com", "secret123");
    // findBy* waits for the route change to render the login marker.
    expect(await screen.findByText("login page")).toBeInTheDocument();
  });

  // Failure path: when register rejects, an error message is shown and the
  // user stays on the register screen (no navigation).
  it("shows an error message and stays on the page when register fails", async () => {
    const user = userEvent.setup();
    // A plain Error is not an AxiosError, so getApiErrorMessage returns its
    // generic fallback — enough to prove the error branch renders a message.
    const register = vi.fn().mockRejectedValue(new Error("network down"));
    renderRegister(register);

    await user.type(screen.getByLabelText("Nome"), "Ana Souza");
    await user.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await user.type(screen.getByLabelText("Senha"), "secret123");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(
      await screen.findByText("Algo deu errado. Tente novamente.")
    ).toBeInTheDocument();
    expect(screen.queryByText("login page")).not.toBeInTheDocument();
  });
});
