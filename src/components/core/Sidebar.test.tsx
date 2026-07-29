import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import Sidebar from "./Sidebar";
import { AuthContext } from "@/context/auth-context";
import { useUiStore } from "@/stores/ui";

const logout = vi.fn();

// The shadcn sidebar reads its open/collapsed state from context, so the
// component under test needs a SidebarProvider, plus the router wrapper it
// already needed for its <Link> items.
function renderSidebar() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          user: { id: 1, name: "Gabriel Dantas", email: "gabriel@x.com", role: "standard" },
          isAuthenticated: true,
          login: vi.fn(),
          register: vi.fn(),
          logout,
        }}
      >
        <SidebarProvider>
          <Sidebar />
        </SidebarProvider>
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

  it("shows the coming-soon badge on disabled items", () => {
    renderSidebar();
    expect(screen.getByRole("button", { name: /Dashboard/ })).toBeDisabled();
    // One badge per disabled item (Dashboard, Time, Calendário).
    expect(screen.getAllByText("em breve")).toHaveLength(3);
  });

  it("logs out and navigates when Sair is clicked", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(logout).toHaveBeenCalledOnce();
  });
});
