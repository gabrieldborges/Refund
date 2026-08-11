import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryWrapper } from "@/test/utils";
import { AuthContext } from "@/context/auth-context";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import PageTeamMember from "./PageTeamMember";
import { teamMemberLoader } from "../router-loaders";

const ADMIN = { id: 9, name: "Chefe", email: "chefe@example.com", role: "admin" as const };

function renderMember(entry = "/team/1") {
  localStorage.setItem(TOKEN_STORAGE_KEY, "token");
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(ADMIN));

  const router = createMemoryRouter(
    [{ path: "/team/:id", loader: teamMemberLoader, Component: PageTeamMember }],
    { initialEntries: [entry] }
  );

  return render(
    <QueryWrapper>
      <AuthContext.Provider
        value={{
          user: ADMIN,
          isAuthenticated: true,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryWrapper>
  );
}

beforeEach(() => {
  localStorage.clear();
  queryClient.clear();
});

describe("PageTeamMember", () => {
  it("shows the person's identity", async () => {
    renderMember();

    expect(await screen.findByRole("heading", { name: "Ana Souza" })).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("Padrão")).toBeInTheDocument();
  });

  // The reason RefundStatsPanel owns no Card and no title. If it ever grows one,
  // this fails.
  it("does not show the name twice", async () => {
    renderMember();
    await screen.findByRole("heading", { name: "Ana Souza" });

    expect(screen.getAllByRole("heading", { name: "Ana Souza" })).toHaveLength(1);
  });

  it("renders that person's requests panel", async () => {
    renderMember();

    expect(await screen.findByText("Solicitações")).toBeInTheDocument();
  });

  // The panel is shared with the review screen, where a row is highlighted.
  // Here there is no open refund, so nothing may be marked current.
  it("marks no request as current", async () => {
    const { container } = renderMember();
    await screen.findByText("Solicitações");

    expect(container.querySelector('[aria-current="page"]')).toBeNull();
  });

  // And no navigation arrows, because the slot is empty here.
  it("renders no review navigation arrows", async () => {
    renderMember();
    await screen.findByText("Solicitações");

    expect(
      screen.queryByRole("button", { name: "Solicitação anterior deste solicitante" })
    ).toBeNull();
  });

  it("falls back to a dash for a null member-since date", async () => {
    renderMember("/team/2");

    await screen.findByRole("heading", { name: "Chefe Silva" });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  // Loader stubbed for the same reason as PageTeam's failure test:
  // teamMemberLoader prefetches with ensureQueryData, which rejects on a 500, so
  // through the real loader the route throws into ContentError and this
  // component's own error branch is never reached.
  it("announces a failure when the user cannot be loaded", async () => {
    server.use(http.get("*/users/:id", () => new HttpResponse(null, { status: 500 })));

    const router = createMemoryRouter(
      [{ path: "/team/:id", loader: () => ({ id: "1" }), Component: PageTeamMember }],
      { initialEntries: ["/team/1"] }
    );
    render(
      <QueryWrapper>
        <AuthContext.Provider
          value={{
            user: ADMIN,
            isAuthenticated: true,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </QueryWrapper>
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar este usuário."
    );
  });
});
