import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import Sidebar from "./Sidebar";
import { AuthContext } from "@/context/auth-context";
import { useUiStore, DEFAULT_LOCALE } from "@/stores/ui";
import { setTestLocale } from "@/test/i18n";

const logout = vi.fn();

// The shadcn sidebar reads its open/collapsed state from context, so the
// component under test needs a SidebarProvider, plus the router wrapper it
// already needed for its <Link> items.
function renderSidebar(role: "standard" | "admin" = "standard") {
  return render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          user: { id: 1, name: "Gabriel Dantas", email: "gabriel@x.com", role },
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
    expect(screen.queryByRole("link", { name: /Calend/ })).not.toBeInTheDocument();
  });

  it("shows the coming-soon badge on disabled items", () => {
    renderSidebar();
        // One badge per disabled item. Time left when the team directory shipped and
    // Dashboard left with this cycle, so only Calendário remains — cycle 3.
    expect(screen.getByRole("button", { name: /Calend/ })).toBeDisabled();
    expect(screen.getAllByText("em breve")).toHaveLength(1);
  });

  // Time is admin-only. It disappears for a standard user rather than rendering
  // disabled: a greyed-out item reads as "not yet", and this is "not ever, for
  // you". The route guards itself too, and the API refuses regardless (BR-025).
  it("hides admin-only items from a standard user", () => {
    renderSidebar("standard");
    expect(screen.queryByText("Time")).not.toBeInTheDocument();
  });

  it("shows admin-only items to an admin, as a real link", () => {
    renderSidebar("admin");
    expect(screen.getByRole("link", { name: /Time/ })).toHaveAttribute("href", "/team");
  });

  // The badge count must not change with the role: hiding an item is not the
  // same as marking it coming-soon, and conflating the two would let a
  // regression in either mechanism pass.
  it("keeps the coming-soon count the same for an admin", () => {
    renderSidebar("admin");
    expect(screen.getAllByText("em breve")).toHaveLength(1);
  });

  it("logs out and navigates when Sair is clicked", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(logout).toHaveBeenCalledOnce();
  });
});

// On mobile the sidebar is an overlay drawer, so navigating without closing it
// leaves the new page hidden behind the panel: the user has to tap a second
// time just to see the result of the first.
describe("Sidebar on mobile", () => {
  const originalInnerWidth = window.innerWidth;

  // useIsMobile reads window.innerWidth on mount, so the width has to be set
  // before render — not after.
  beforeEach(() => {
    window.innerWidth = 390;
  });

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
  });

  // SidebarTrigger is rendered here only to open the drawer: it lives in the
  // Topbar in the real app, and without it there is no way to reach the open
  // state this test is about.
  function renderMobileSidebar() {
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
            <SidebarTrigger />
            <Sidebar />
          </SidebarProvider>
        </AuthContext.Provider>
      </MemoryRouter>,
    );
  }

  it("closes the drawer when a navigation link is followed", async () => {
    const user = userEvent.setup();
    renderMobileSidebar();

    await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    const link = await screen.findByRole("link", { name: /Solicitações/ });
    // Asserted explicitly so the test cannot pass vacuously: without this, a
    // drawer that never opened would also satisfy the "closed" check below.
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(link);

    // The drawer is a Radix dialog: closed means unmounted, not hidden.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
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
