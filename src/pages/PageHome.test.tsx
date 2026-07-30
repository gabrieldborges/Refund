import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundFixture, refundStatsFixture } from "@/test/msw/handlers";
import { QueryWrapper } from "@/test/utils";
import { AuthProvider } from "@/context/AuthContext";
import { USER_STORAGE_KEY } from "@/lib/api";
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

// Seeds the session AuthProvider reads on mount, so PageHome's useAuth() call
// sees a logged-in user instead of throwing/redirecting. id: 1 matches
// refundFixture.user.id and refundStatsFixture.user_id, so the money-card
// assertions below line up with the same fixtures the other PageHome tests use.
function seedSession(role: "standard" | "admin") {
  localStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify({ id: 1, name: "Ana Souza", email: "ana@exemplo.com", role })
  );
}

// Mounts PageHome behind a route whose loader mirrors what homeLoader hands
// down ({ page, perPage, name }). AuthProvider is real (not stubbed) because
// PageHome now reads the logged-in user's id/role via useAuth() to decide
// which stats to request and how to label the money card. The page is derived
// from initialEntry so the stub loader stays honest for whatever entry a test
// passes, instead of hardcoding a single page number.
function renderPageHome(initialEntry = "/", role: "standard" | "admin" = "standard") {
  seedSession(role);
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
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryWrapper>
  );

  return { ...view, router };
}

describe("PageHome", () => {
  // The "Solicitações" count must show the total the API reported for the
  // whole filtered set — not a count of the rows on the current page, which
  // would be wrong as soon as there is more than one page. (The money card's
  // own source is covered separately below, per role.)
  it("shows the request total coming from the API, not the page size", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));

    renderPageHome();

    expect(await screen.findByText("24")).toBeInTheDocument();
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

describe("PageHome money card", () => {
  // This is the regression test for the bug this task fixes: the Home used to
  // show sum_amount_in_cents from the (unfiltered-by-status) list, which mixes
  // pending forecast, approved liability, paid expense and rejected nothing
  // into one meaningless figure. A standard user's money card must instead be
  // labelled "Aprovado + pago" and sum only approved + paid from refund-stats
  // (fixture: 65000 + 40000 = 105000 cents). Reverting the card to
  // data?.sum_amount_in_cents turns this red — see task-2-report.md for that run.
  it("sums only approved + paid for a standard user, and adds a Pendentes card", async () => {
    renderPageHome("/", "standard");

    expect(await screen.findByText("Aprovado + pago")).toBeInTheDocument();
    expect(await screen.findByText("R$ 1.050,00")).toBeInTheDocument();

    expect(screen.getByText("Pendentes")).toBeInTheDocument();
    expect(
      await screen.findByText(String(refundStatsFixture.by_status.pending.count))
    ).toBeInTheDocument();

    // The old label and the old (cross-status) figure must both be gone.
    expect(screen.queryByText("Total")).not.toBeInTheDocument();
  });

  // An admin's Home lists everyone's refunds, but GET /refund-stats is
  // per-user — there is no endpoint for a global per-status aggregate. Until
  // one exists, the admin card is honestly labelled "Solicitado" and reads the
  // list's own sum_amount_in_cents, instead of faking a per-status total with
  // N per-user requests.
  it("labels the money card 'Solicitado' and uses the list sum for an admin", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));

    renderPageHome("/", "admin");

    expect(await screen.findByText("Solicitado")).toBeInTheDocument();
    expect(await screen.findByText("R$ 4.182,00")).toBeInTheDocument();
    expect(screen.queryByText("Pendentes")).not.toBeInTheDocument();
  });

  // A failed stats request must not fall through to the "?? 0" default and
  // render R$ 0,00 / 0 — that reads as "this user has nothing approved, paid
  // or pending", which is a lie when the real answer is "unknown, the request
  // failed". Both cards must surface the failure instead.
  it("shows a failure state instead of a false zero when stats fail to load", async () => {
    server.use(http.get("*/users/:id/refund-stats", () => HttpResponse.json({}, { status: 500 })));

    renderPageHome("/", "standard");

    const alerts = await screen.findAllByRole("alert");
    expect(alerts).toHaveLength(2);
    alerts.forEach((alert) => expect(alert).toHaveTextContent("Não foi possível carregar."));

    expect(screen.queryByText("R$ 0,00")).not.toBeInTheDocument();
  });
});
