import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import Sidebar from "./Sidebar";
import { AuthContext } from "@/context/auth-context";
import { useUiStore, DEFAULT_LOCALE } from "@/stores/ui";
import { setTestLocale } from "@/test/i18n";

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
  useUiStore.setState({ theme: "light", locale: DEFAULT_LOCALE, sidebarCollapsed: false });
  logout.mockClear();
});

// i18next is module-level state shared across every test file, so a test that
// switches language has to switch back or it leaks into whatever runs next.
afterEach(async () => {
  await setTestLocale(DEFAULT_LOCALE);
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

// These two controls used to live in the Topbar, where they crowded the title
// on narrow screens. The behaviour did not change with the move, so neither did
// the assertions — only the component they run against.
describe("Sidebar preferences", () => {
  it("toggles the theme in the store", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: "Alternar tema" }));
    expect(useUiStore.getState().theme).toBe("dark");
  });

  // The click has to do two things: record the choice in the store AND load
  // the catalogue. Asserting only the store would pass even if the interface
  // never changed language, which is the whole point of the control.
  it("switches the store and the rendered copy to English", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "Alternar idioma" }));

    expect(useUiStore.getState().locale).toBe("en-US");
    expect(await screen.findByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  // Toggling twice must land back where it started, which is what makes a
  // single button usable as a switch with two locales.
  it("switches back to Portuguese on a second toggle", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "Alternar idioma" }));
    await user.click(await screen.findByRole("button", { name: "Change language" }));

    expect(useUiStore.getState().locale).toBe("pt-BR");
    expect(await screen.findByRole("button", { name: "Sair" })).toBeInTheDocument();
  });
});
