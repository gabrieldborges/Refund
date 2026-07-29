import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundFixture } from "@/test/msw/handlers";
import { QueryWrapper } from "@/test/utils";
import PageHome from "./PageHome";

// A second page's worth of matches: 10 rows on this page, but 24 across every
// page and a sum that only the API (not a client-side reduce over the visible
// rows) could know.
function pagedListResponse() {
  return {
    type: "Refund",
    count: 10,
    total: 24,
    sum_amount_in_cents: 418200,
    page: 1,
    per_page: 10,
    total_pages: 3,
    attributes: Array.from({ length: 10 }, (_, index) => ({
      ...refundFixture,
      id: index + 1,
      name: `Solicitação ${index + 1}`,
    })),
  };
}

// Mounts PageHome behind a route whose loader mirrors what homeLoader hands
// down ({ page, perPage, name }), without pulling in auth/session concerns.
// The page is derived from initialEntry so the stub loader stays honest for
// whatever entry a test passes, instead of hardcoding a single page number.
function renderPageHome(initialEntry = "/") {
  const url = new URL(initialEntry, "http://localhost");
  const page = Number(url.searchParams.get("page") ?? 1);

  const router = createMemoryRouter(
    [
      {
        path: "/",
        loader: () => ({ page, perPage: 10, name: undefined }),
        Component: PageHome,
      },
    ],
    { initialEntries: [initialEntry] }
  );

  const view = render(
    <QueryWrapper>
      <RouterProvider router={router} />
    </QueryWrapper>
  );

  return { ...view, router };
}

describe("PageHome", () => {
  // The summary band must show the totals the API reported for the whole filtered
  // set — not a sum of the rows on the current page, which would be wrong as soon
  // as there is more than one page.
  it("shows the totals coming from the API", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));

    renderPageHome();

    expect(await screen.findByText("24")).toBeInTheDocument();
    expect(screen.getByText("R$ 4.182,00")).toBeInTheDocument();
  });

  // Pagination controls must be reachable by their accessible name, and the
  // previous-page button must be disabled on the first page.
  it("disables the previous page button on the first page", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));

    renderPageHome();

    expect(await screen.findByRole("button", { name: "Página anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Próxima página" })).toBeEnabled();
  });

  // RefundSearch debounces typing before pushing it to the URL. Starting on
  // page 2 is what makes the reset assertion real: the page param must
  // disappear (page 1 carries no param by design), which is the branch in
  // updateListLocation that had no coverage while the fixture always started
  // on page 1.
  it("updates the search param after debounce and resets away from page 2", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));
    const user = userEvent.setup();

    const { router } = renderPageHome("/?page=2");
    expect(router.state.location.search).toBe("?page=2");

    const searchField = await screen.findByRole("textbox", { name: "Pesquisar pelo nome" });
    await user.type(searchField, "Ana");

    await waitFor(
      () => {
        expect(router.state.location.search).toBe("?name=Ana");
      },
      { timeout: 2000 }
    );
  });

  // Each row carries its status, so the list is readable without opening a
  // refund. Read-only here: approving and rejecting is a later cycle.
  it("shows the status of each row", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));

    renderPageHome();

    const badges = await screen.findAllByText("Pendente");
    expect(badges).toHaveLength(10);
    // The label alone doesn't catch a badge wired to the wrong variant (e.g.
    // "default" or "destructive"), which would still read "Pendente" but be
    // the wrong colour. Assert the Badge's data-variant too.
    badges.forEach((badge) => {
      expect(badge).toHaveAttribute("data-variant", "secondary");
    });
  });
});
