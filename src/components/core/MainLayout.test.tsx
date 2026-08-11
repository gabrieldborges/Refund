import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import MainLayout from "./MainLayout";
import ContentError from "./ContentError";
import { AuthContext } from "@/context/auth-context";
import { useUiStore } from "@/stores/ui";

function Boom(): never {
  throw new Error("page boom");
}

// Mount MainLayout as a route with a title handle and a child page.
//
// `children` mirrors the nesting in router.tsx: the pages hang off a pathless
// route that carries ContentError as its ErrorBoundary. Passing a throwing
// component exercises the case this nesting exists for.
function renderShell(childElement: React.ReactNode = <p>home page</p>) {
  const router = createMemoryRouter(
    [
      {
        Component: MainLayout,
        children: [
          {
            ErrorBoundary: ContentError,
            children: [
              {
                index: true,
                handle: { titleKey: "routes.home" },
                element: childElement,
              },
            ],
          },
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
          user: { id: 1, name: "Gabriel Dantas", email: "gabriel@x.com", role: "standard" },
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
    expect(screen.getByRole("heading", { name: "Solicitações" })).toBeInTheDocument();
    expect(screen.getByText("home page")).toBeInTheDocument();
  });

  it("shows the profile from the sidebar", () => {
    renderShell();
    expect(screen.getByText("@gabriel")).toBeInTheDocument();
  });

  // SidebarInset already renders a <main> internally; the content area must
  // not add a second one, or there would be two competing "main" landmarks
  // for assistive tech to navigate. getByRole throws if more than one matches.
  it("renders exactly one main landmark", () => {
    renderShell();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("reaches the store when the trigger is clicked", async () => {
    // Confirms the trigger click flows through to the persisted store value
    // (a wiring smoke test). A single click flips to the opposite state
    // either way, so it can't by itself distinguish setSidebarCollapsed from
    // the argument-less toggleSidebar — that idempotency property (repeated
    // calls with the same explicit value don't flip) is proven separately in
    // src/stores/ui.test.ts.
    const user = userEvent.setup();
    renderShell();
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    await user.click(screen.getByRole("button", { name: "Alternar menu" }));
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  // The reason the error boundary hangs off a pathless route BELOW MainLayout
  // instead of on MainLayout itself: a page that throws must not take the
  // shell down with it. Before this nesting, the root boundary replaced the
  // entire document and the user lost the navigation along with the page.
  it("keeps the shell rendered when a page throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    renderShell(<Boom />);

    // The error UI replaced only the page content...
    expect(await screen.findByRole("heading", { name: "Algo deu errado" })).toBeInTheDocument();
    expect(screen.queryByText("home page")).not.toBeInTheDocument();
    // ...while topbar title and sidebar profile survived.
    expect(screen.getByRole("heading", { name: "Solicitações" })).toBeInTheDocument();
    expect(screen.getByText("@gabriel")).toBeInTheDocument();
    // And the shell still owns the single main landmark.
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
