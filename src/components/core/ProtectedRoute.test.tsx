import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import ProtectedRoute from "./ProtectedRoute";
import { AuthContext } from "../../context/auth-context";
import type { AuthContextValue } from "../../context/auth-context";

// Builds a minimal AuthContext value. Only `isAuthenticated` matters for
// ProtectedRoute; the callbacks are present just to satisfy the type.
function authValue(isAuthenticated: boolean): AuthContextValue {
  return {
    user: null,
    isAuthenticated,
    login: async () => {},
    register: async () => {},
    logout: () => {},
  };
}

// Renders ProtectedRoute as a layout route guarding "/", plus a "/login" route,
// so we can observe which one wins for a given auth state.
function renderAt(isAuthenticated: boolean) {
  render(
    <AuthContext.Provider value={authValue(isAuthenticated)}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>conteúdo protegido</div>} />
          </Route>
          <Route path="/login" element={<div>tela de login</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("ProtectedRoute", () => {
  // Authenticated: the guarded Outlet content is shown.
  it("renders the protected content when authenticated", () => {
    renderAt(true);
    expect(screen.getByText("conteúdo protegido")).toBeInTheDocument();
    expect(screen.queryByText("tela de login")).not.toBeInTheDocument();
  });

  // Unauthenticated: the user is redirected to the login route instead.
  it("redirects to /login when not authenticated", () => {
    renderAt(false);
    expect(screen.getByText("tela de login")).toBeInTheDocument();
    expect(screen.queryByText("conteúdo protegido")).not.toBeInTheDocument();
  });
});
