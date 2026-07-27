import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import Sidebar from "./Sidebar";
import { AuthContext } from "@/context/auth-context";
import { useUiStore } from "@/stores/ui";

const logout = vi.fn();

// Renders the sidebar inside a router + a fake auth context.
function renderSidebar() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          user: { name: "Gabriel Dantas", email: "gabriel@x.com", role: "standard" },
          isAuthenticated: true,
          login: vi.fn(),
          register: vi.fn(),
          logout,
        }}
      >
        <Sidebar toggled={false} onBackdropClick={() => {}} />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useUiStore.setState({ theme: "light", sidebarCollapsed: false });
  logout.mockClear();
});

describe("Sidebar", () => {
  it("shows derived profile initials and username", () => {
    renderSidebar();
    expect(screen.getByText("GD")).toBeInTheDocument();
    expect(screen.getByText("@gabriel")).toBeInTheDocument();
  });

  it("links the active item to the home route", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /Solicitações/ })).toHaveAttribute("href", "/");
  });

  it("does not render coming-soon items as links", () => {
    renderSidebar();
    expect(screen.queryByRole("link", { name: /Dashboard/ })).not.toBeInTheDocument();
  });

  it("logs out and navigates when Sair is clicked", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(logout).toHaveBeenCalledOnce();
  });
});
