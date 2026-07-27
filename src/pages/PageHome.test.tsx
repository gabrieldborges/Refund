import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundFixture } from "@/test/msw/handlers";
import { QueryWrapper } from "@/test/utils";
import PageHome from "./PageHome";

// A second page's worth of matches: 6 rows on this page, but 24 across every
// page and a sum that only the API (not a client-side reduce over the visible
// rows) could know.
function pagedListResponse() {
  return {
    type: "Refund",
    count: 6,
    total: 24,
    sum_amount_in_cents: 418200,
    page: 1,
    per_page: 6,
    total_pages: 4,
    attributes: Array.from({ length: 6 }, (_, index) => ({
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
        loader: () => ({ page: 1, perPage: 6, name: undefined }),
        Component: PageHome,
      },
    ],
    { initialEntries: ["/"] }
  );

  return render(
    <QueryWrapper>
      <RouterProvider router={router} />
    </QueryWrapper>
  );
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
});
