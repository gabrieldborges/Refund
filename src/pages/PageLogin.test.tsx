import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import PageLogin from "./PageLogin";
import { AuthContext } from "../context/auth-context";
import type { AuthContextValue } from "../context/auth-context";

// Builds an AuthContext value whose `login` is the provided spy. The login
// flow is exercised without any network: we mock the boundary the real app
// calls (`login`), which is exactly what MSW will replace in Item 5.
function authValueWithLogin(login: AuthContextValue["login"]): AuthContextValue {
  return {
    user: null,
    isAuthenticated: false,
    login,
    register: async () => {},
    logout: () => {},
  };
}

// Renders PageLogin at "/login" alongside a marker "/" route, so a successful
// login (which calls navigate("/")) can be observed as a route change.
function renderLogin(login: AuthContextValue["login"]) {
  render(
    <AuthContext.Provider value={authValueWithLogin(login)}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<PageLogin />} />
          <Route path="/" element={<div>home page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("PageLogin", () => {
  // Happy path: typing credentials and submitting calls login with those
  // values and navigates to the home route.
  it("submits the credentials and navigates home on success", async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue(undefined);
    renderLogin(login);

    // The shadcn Form associates each label with its input via aria, so we
    // query by accessible name instead of the visible placeholder text.
    await user.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await user.type(screen.getByLabelText("Senha"), "secret123");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(login).toHaveBeenCalledWith("ana@exemplo.com", "secret123");
    // findBy* waits for the route change to render the home marker.
    expect(await screen.findByText("home page")).toBeInTheDocument();
  });

  // Failure path: when login rejects, an error message is shown and the user
  // stays on the login screen (no navigation).
  it("shows an error message and stays on the page when login fails", async () => {
    const user = userEvent.setup();
    // A plain Error is not an AxiosError, so getApiErrorMessage returns its
    // generic fallback — enough to prove the error branch renders a message.
    const login = vi.fn().mockRejectedValue(new Error("network down"));
    renderLogin(login);

    await user.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await user.type(screen.getByLabelText("Senha"), "secret123");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(
      await screen.findByText("Algo deu errado. Tente novamente.")
    ).toBeInTheDocument();
    expect(screen.queryByText("home page")).not.toBeInTheDocument();
  });

  // The shadcn Form wires aria-invalid and aria-describedby on its own: an
  // invalid field must announce itself and point at its message. This is the
  // Item 7 accessibility work, now handled by the component instead of by hand.
  it("marks an invalid field and links it to its message", async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue(undefined);
    renderLogin(login);

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    const email = await screen.findByLabelText("E-mail");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("E-mail é obrigatório");
  });
});
