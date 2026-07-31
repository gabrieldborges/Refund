import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router";
import PageLogin from "./PageLogin";
import { AuthProvider } from "../context/AuthContext";
import { TOKEN_STORAGE_KEY } from "../lib/api";
import { server } from "../test/msw/server";
import { loginFixture } from "../test/msw/handlers";

// Integration counterpart to PageLogin.test.tsx. Here nothing is mocked at the
// AuthContext boundary: the real AuthProvider runs, the real axios call is made,
// MSW answers on the network, and loginResponseSchema parses the body. Only the
// network is faked. This is the confidence the Item 4 boundary-mock test cannot
// give (it never exercised axios or the schema).

// Renders PageLogin behind the real AuthProvider, with a marker "/" route so a
// successful login (navigate("/")) can be observed as a route change. A real
// data router (not the declarative <Routes>) is required now that PageLogin
// reads useNavigation(), which throws outside one.
function renderLoginApp() {
  const router = createMemoryRouter(
    [
      { path: "/login", Component: PageLogin },
      { path: "/", element: <div>home page</div> },
    ],
    { initialEntries: ["/login"] }
  );

  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

describe("PageLogin (integration)", () => {
  // Happy path: the real login stores the token from the parsed response and
  // navigates home.
  it("logs in, stores the token and navigates home", async () => {
    const user = userEvent.setup();
    renderLoginApp();

    await user.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await user.type(screen.getByLabelText("Senha"), "secret123");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("home page")).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe(loginFixture.token);
  });

  // Failure path: a 401 makes login reject; PageLogin shows the API message and
  // stays on the login screen. (The api.ts interceptor also clears the session
  // and assigns window.location on any 401 — harmless here: MemoryRouter ignores
  // window.location and jsdom only logs a navigation notice.)
  it("shows the API error message and stays on the page on 401", async () => {
    server.use(
      http.post("*/auth/login", () =>
        HttpResponse.json({ detail: "E-mail ou senha inválidos" }, { status: 401 })
      )
    );
    const user = userEvent.setup();
    renderLoginApp();

    await user.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await user.type(screen.getByLabelText("Senha"), "wrong-pass");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("E-mail ou senha inválidos")).toBeInTheDocument();
    expect(screen.queryByText("home page")).not.toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});
