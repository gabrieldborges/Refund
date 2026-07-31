import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { api } from "@/lib/api";
import { REFUNDS_PER_PAGE } from "@/features/refunds";
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
// login (which calls navigate("/")) can be observed as a route change. This
// now has to be a real data router (createMemoryRouter/RouterProvider), not
// the declarative <Routes>: PageLogin reads useNavigation(), which throws
// outside a data router's context.
function renderLogin(login: AuthContextValue["login"]) {
  const router = createMemoryRouter(
    [
      { path: "/login", Component: PageLogin },
      { path: "/", element: <div>home page</div> },
    ],
    { initialEntries: ["/login"] }
  );

  render(
    <AuthContext.Provider value={authValueWithLogin(login)}>
      <RouterProvider router={router} />
    </AuthContext.Provider>
  );
}

// Same two routes, but the "/" destination now carries a loader that awaits
// GET /refunds, mirroring the real homeLoader (which awaits
// queryClient.ensureQueryData before the Home route ever renders). That gives
// the router a genuine window where navigation.state is "loading" — without
// it there would be no navigation to observe, and a test could pass or fail
// for the wrong reason. `login` always resolves immediately here: only the
// post-login navigation is meant to be slow.
function renderLoginWithHomeRoute() {
  const login = vi.fn().mockResolvedValue(undefined);
  const router = createMemoryRouter(
    [
      { path: "/login", Component: PageLogin },
      { path: "/", loader: () => api.get("/refunds"), element: <div>home page</div> },
    ],
    { initialEntries: ["/login"] }
  );

  render(
    <AuthContext.Provider value={authValueWithLogin(login)}>
      <RouterProvider router={router} />
    </AuthContext.Provider>
  );
}

function emptyListResponse() {
  return {
    type: "Refund",
    count: 0,
    total: 0,
    sum_amount_in_cents: 0,
    page: 1,
    per_page: REFUNDS_PER_PAGE,
    total_pages: 0,
    attributes: [],
  };
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

  // The submit button must stay busy until the app has actually moved. Before
  // this, isSubmitting fell as soon as login() resolved, leaving a ready-looking
  // button on a page that had not changed yet — the router's loader was still
  // fetching.
  it("keeps the submit button busy while the post-login navigation is in flight", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/refunds", async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        return HttpResponse.json(emptyListResponse());
      })
    );

    renderLoginWithHomeRoute();

    await user.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await user.type(screen.getByLabelText("Senha"), "123456");
    await user.click(screen.getByRole("button", { name: /Entrar/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Entrando/ })).toBeDisabled();
    });
  });
});
