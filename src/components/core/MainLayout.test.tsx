import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import MainLayout from "./MainLayout";
import { AuthContext } from "@/context/auth-context";
import { useUiStore } from "@/stores/ui";

// Mount MainLayout as a route with a title handle and a child page.
function renderShell() {
  const router = createMemoryRouter(
    [
      {
        Component: MainLayout,
        children: [
          { index: true, handle: { title: "Solicitações de reembolso" }, element: <p>home page</p> },
        ],
      },
    ],
    { initialEntries: ["/"] },
  );
  // MainLayout mounts RefundFormDialog, which needs a QueryClient.
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user: { name: "Gabriel Dantas", email: "gabriel@x.com", role: "standard" },
          isAuthenticated: true,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useUiStore.setState({ theme: "light", sidebarCollapsed: false });
});

describe("MainLayout", () => {
  it("renders the route title in the topbar and the child via Outlet", () => {
    renderShell();
    expect(screen.getByRole("heading", { name: "Solicitações de reembolso" })).toBeInTheDocument();
    expect(screen.getByText("home page")).toBeInTheDocument();
  });

  it("shows the profile from the sidebar", () => {
    renderShell();
    expect(screen.getByText("@gabriel")).toBeInTheDocument();
  });
});
