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
function renderPageHome() {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        loader: () => ({ page: 1, perPage: 10, name: undefined }),
        Component: PageHome,
      },
    ],
    { initialEntries: ["/"] }
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

  // RefundSearch debounces typing before pushing it to the URL. Typing must
  // eventually update the `name` search param and reset `page` back to 1 (the
  // page param is dropped entirely, since page 1 has no page param by design).
  it("updates the search param on the URL after debounce and resets the page", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));
    const user = userEvent.setup();

    const { router } = renderPageHome();

    const searchField = await screen.findByRole("textbox", { name: "Pesquisar pelo nome" });
    await user.type(searchField, "Ana");

    await waitFor(
      () => {
        expect(router.state.location.search).toBe("?name=Ana");
      },
      { timeout: 2000 }
    );
  });
});
