import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryWrapper } from "@/test/utils";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import PageTeam from "./PageTeam";
import { teamLoader } from "../router-loaders";

function signInAsAdmin() {
  localStorage.setItem(TOKEN_STORAGE_KEY, "token");
  localStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify({ id: 9, name: "Chefe", email: "chefe@example.com", role: "admin" })
  );
}

function renderPage(entry = "/team") {
  signInAsAdmin();
  const router = createMemoryRouter(
    [{ path: "/team", loader: teamLoader, Component: PageTeam }],
    { initialEntries: [entry] }
  );
  const result = render(
    <QueryWrapper>
      <RouterProvider router={router} />
    </QueryWrapper>
  );
  return { router, ...result };
}

beforeEach(() => {
  localStorage.clear();
  // The loader prefetches through the module-level client, so a cached page
  // would otherwise satisfy the next test's request.
  queryClient.clear();
});

describe("PageTeam", () => {
  it("lists the users returned by the API", async () => {
    renderPage();

    expect(await screen.findByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("Chefe Silva")).toBeInTheDocument();
  });

  it("renders each person's role as a label", async () => {
    renderPage();

    expect(await screen.findByText("Padrão")).toBeInTheDocument();
    expect(screen.getByText("Administrador")).toBeInTheDocument();
  });

  // The debounced search writes to the URL, and the URL is what re-runs the
  // loader — the same mechanism the Home uses.
  it("writes the debounced search into the URL", async () => {
    const { router } = renderPage();
    await screen.findByText("Ana Souza");

    await userEvent.type(screen.getByLabelText("Buscar por nome"), "ana");

    await waitFor(() => expect(router.state.location.search).toContain("name=ana"), {
      timeout: 3000,
    });
  });

  // The MSW handler honours `name`, so this proves the filter travelled to the
  // request rather than only into the URL.
  it("shows only the matching person after searching", async () => {
    renderPage("/team?name=ana");

    expect(await screen.findByText("Ana Souza")).toBeInTheDocument();
    expect(screen.queryByText("Chefe Silva")).toBeNull();
  });

  it("shows the empty message when the search matches nobody", async () => {
    renderPage("/team?name=zzz");

    expect(await screen.findByText("Nenhum usuário encontrado.")).toBeInTheDocument();
  });

  // Silence would be indistinguishable from a search with no results.
  //
  // The loader is STUBBED here on purpose. teamLoader prefetches with
  // ensureQueryData, which rejects on a 500, so through the real loader the
  // route throws and the page never renders — that path is the router's
  // ErrorBoundary (ContentError), not this component's isError branch. The
  // branch this test covers is the one reached when the query fails after the
  // loader succeeded, e.g. a background refetch.
  it("announces a load failure instead of an empty table", async () => {
    server.use(http.get("*/users", () => new HttpResponse(null, { status: 500 })));

    const router = createMemoryRouter(
      [
        {
          path: "/team",
          loader: () => ({ page: 1, perPage: 10, name: undefined }),
          Component: PageTeam,
        },
      ],
      { initialEntries: ["/team"] }
    );
    render(
      <QueryWrapper>
        <RouterProvider router={router} />
      </QueryWrapper>
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os usuários."
    );
  });

  // Two users at a page size of ten means a single page, so the controls must
  // not offer a second one.
  it("disables both arrows on a single page", async () => {
    renderPage();
    await screen.findByText("Ana Souza");

    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Próxima página" })).toBeDisabled();
  });
});
