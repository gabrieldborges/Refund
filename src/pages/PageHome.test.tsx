import { describe, it, expect } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundFixture, refundStatsFixture } from "@/test/msw/handlers";
import { QueryWrapper } from "@/test/utils";
import { AuthProvider } from "@/context/AuthContext";
import { USER_STORAGE_KEY } from "@/lib/api";
import { REFUNDS_PER_PAGE } from "@/features/refunds";
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
    per_page: REFUNDS_PER_PAGE,
    total_pages: 3,
    attributes: Array.from({ length: 10 }, (_, index) => ({
      ...refundFixture,
      id: index + 1,
      name: `Solicitação ${index + 1}`,
    })),
  };
}

// Seeds the session AuthProvider reads on mount, so PageHome's useAuth() call
// sees a logged-in user instead of throwing/redirecting. id defaults to 1,
// matching refundFixture.user.id and refundStatsFixture.user_id, so the
// money-card assertions below line up with the same fixtures the other
// PageHome tests use. Row-navigation tests override id to place the session
// on the other side of refundFixture.user.id (1) when they need an admin
// looking at someone else's refund.
function seedSession(role: "standard" | "admin", id = 1) {
  localStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify({ id, name: "Ana Souza", email: "ana@exemplo.com", role })
  );
}

// Mounts PageHome behind a route whose loader mirrors what homeLoader hands
// down ({ page, perPage, name }). AuthProvider is real (not stubbed) because
// PageHome now reads the logged-in user's id/role via useAuth() to decide
// which stats to request and how to label the money card. The page is derived
// from initialEntry so the stub loader stays honest for whatever entry a test
// passes, instead of hardcoding a single page number.
function renderPageHome(
  initialEntry = "/",
  role: "standard" | "admin" = "standard",
  id = 1,
  loaderOverrides: Record<string, unknown> = {}
) {
  seedSession(role, id);
  const url = new URL(initialEntry, "http://localhost");
  const page = Number(url.searchParams.get("page") ?? 1);

  const router = createMemoryRouter(
    [
      {
        path: "/",
        loader: () => ({
          page,
          perPage: REFUNDS_PER_PAGE,
          name: undefined,
          status: undefined,
          sort: "created_at",
          order: "desc",
          ...loaderOverrides,
        }),
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
  // per-user — there is no endpoint for a global per-status money aggregate.
  // Until one exists, the admin money card is honestly labelled "Solicitado"
  // and reads the list's own sum_amount_in_cents, instead of faking a
  // per-status total with N per-user requests. (The admin's separate
  // Pendentes card, covered in the "PageHome pending card" block below, does
  // have its own dedicated query — that one only needs a count, not a sum.)
  it("labels the money card 'Solicitado' and uses the list sum for an admin", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));

    renderPageHome("/", "admin");

    expect(await screen.findByText("Solicitado")).toBeInTheDocument();
    expect(await screen.findByText("R$ 4.182,00")).toBeInTheDocument();
  });

  // With a status filter active the API's sum covers only that status, so the
  // fixed "Solicitado" label would put a correct number under a wrong name.
  it("labels the admin money card with the active status filter", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));

    renderPageHome("/", "admin", 2, { status: "paid" });

    // The label should appear in the card. The toolbar also shows "Pago" as the
    // selected filter value, so we scope the query to the card to ensure we're
    // testing the label, not the toolbar.
    const amountText = await screen.findByText("R$ 4.182,00");
    const card = amountText.closest('[data-slot="card"]') as HTMLElement;
    expect(within(card).getByText("Pago")).toBeInTheDocument();
    expect(screen.queryByText("Solicitado")).not.toBeInTheDocument();
  });

  it("goes back to 'Solicitado' when no status filter is active", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));

    renderPageHome("/", "admin", 2);

    expect(await screen.findByText("Solicitado")).toBeInTheDocument();
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

describe("PageHome summary card labels", () => {
  // Three numbers side by side under generic labels, two following the filter
  // and one ignoring it, is the confusion this fixes. Each label states its
  // own scope.
  it("names the active filter on the requests card", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));

    renderPageHome("/", "admin", 2, { status: "paid" });

    expect(await screen.findByText("Solicitações (Pago)")).toBeInTheDocument();
  });

  // "Solicitações" is also the page's own h1, and an admin's Home fires a
  // second request for the pending-count card that (unscoped) would return
  // the same total, so a bare text match on the number could land on either.
  // Distinguishing the two responses by per_page, the same way the pending
  // card tests below do, keeps "24" unique and lets us walk up from it to
  // scope the assertion to the requests card, following the money card
  // tests' `within(card)` pattern.
  it("uses the plain label when no filter is active", async () => {
    server.use(
      http.get("*/refunds", ({ request }) => {
        const params = new URL(request.url).searchParams;
        if (params.get("per_page") === "1") {
          return HttpResponse.json({ ...pagedListResponse(), total: 5 });
        }
        return HttpResponse.json(pagedListResponse());
      })
    );

    renderPageHome("/", "admin", 2);

    const total = await screen.findByText("24");
    const card = total.closest('[data-slot="card"]') as HTMLElement;
    expect(within(card).getByText("Solicitações")).toBeInTheDocument();
    expect(within(card).queryByText(/Solicitações \(/)).not.toBeInTheDocument();
  });

  it("says the pending card ignores the filter when one is active", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));

    renderPageHome("/", "admin", 2, { status: "paid" });

    expect(await screen.findByText("Todas, sem o filtro")).toBeInTheDocument();
  });
});

describe("PageHome pending card", () => {
  // The pending card is global by definition: it answers "what needs my
  // attention", which does not depend on what the user is currently filtering.
  // This is the assertion that would fail if someone wired it to the list.
  it("keeps the admin pending count unchanged when a status filter is active", async () => {
    server.use(
      http.get("*/refunds", ({ request }) => {
        const params = new URL(request.url).searchParams;
        // The dedicated pending query asks for per_page=1; the list does not.
        if (params.get("per_page") === "1") {
          return HttpResponse.json({ ...pagedListResponse(), total: 7 });
        }
        return HttpResponse.json({ ...pagedListResponse(), total: 2 });
      })
    );

    renderPageHome("/", "admin", 2, { status: "paid" });

    expect(await screen.findByText("7")).toBeInTheDocument();
  });

  // A failed pending-count request must not render "0" — indistinguishable
  // from "nothing pending" when the truth is "we don't know". Same idiom as
  // the standard user's Pendentes card and the money card above.
  it("shows a failure state instead of a false zero when the pending count fails to load", async () => {
    server.use(
      http.get("*/refunds", ({ request }) => {
        const params = new URL(request.url).searchParams;
        if (params.get("per_page") === "1") {
          return HttpResponse.json({}, { status: 500 });
        }
        return HttpResponse.json(pagedListResponse());
      })
    );

    renderPageHome("/", "admin");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível carregar.");
    const card = alert.closest('[data-slot="card"]') as HTMLElement;
    expect(within(card).getByText("Pendentes")).toBeInTheDocument();
    expect(within(card).queryByText("0")).not.toBeInTheDocument();
  });
});

describe("PageHome row navigation", () => {
  // BR-016: an admin may review any refund except their own. The row's href
  // must mirror the loader guard from Task 3 (reviewLoader in
  // router-loaders.ts), or a click would land on a route that immediately
  // redirects back. refundFixture (id: 1, user.id: 1) is the default
  // `/refunds` list response, seeded by src/test/msw/handlers.ts.

  // Standard users never get the review route, no matter whose refund it is.
  it("links a standard user to the plain detail page", async () => {
    renderPageHome("/", "standard");

    const row = await screen.findByRole("link", { name: /Almoço com cliente/ });
    expect(row).toHaveAttribute("href", "/refunds/1");
  });

  it("links an admin to the review page for someone else's refund", async () => {
    // Session id 2, refundFixture.user.id 1 — different people.
    renderPageHome("/", "admin", 2);

    const row = await screen.findByRole("link", { name: /Almoço com cliente/ });
    expect(row).toHaveAttribute("href", "/refunds/1/review");
  });

  // The case a careless implementation gets wrong: role alone is not enough
  // to route to /review. When the admin IS the refund's owner, the row must
  // stay on the plain detail page — the one with the Excluir button — because
  // BR-016 forbids reviewing your own refund and the API would refuse it.
  it("links an admin to the plain detail page for their own refund", async () => {
    // Session id 1 matches refundFixture.user.id 1 — same person.
    renderPageHome("/", "admin", 1);

    const row = await screen.findByRole("link", { name: /Almoço com cliente/ });
    expect(row).toHaveAttribute("href", "/refunds/1");
  });
});

describe("PageHome sorting", () => {
  // The proof that sorting is server-side: the click must reach the URL (and
  // from there the request), not reorder the rows already in memory. A
  // client-side sort would leave the URL untouched and silently sort 10 of 24
  // rows — the exact bug the backend query cycle exists to prevent.
  it("writes the clicked column to the URL and resets the page", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));
    const user = userEvent.setup();

    const { router } = renderPageHome("/?page=2", "admin", 2);

    await user.click(await screen.findByRole("button", { name: /Valor/ }));

    await waitFor(() => {
      expect(router.state.location.search).toBe("?sort=amount_in_cents");
    });
  });

  // The default direction carries no information, so it stays out of the URL —
  // the same rule page=1 and the empty name already follow.
  it("omits the default sort from the URL", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));
    const user = userEvent.setup();

    const { router } = renderPageHome("/", "admin", 2);

    const dateHeader = await screen.findByRole("button", { name: /Data/ });
    await user.click(dateHeader);

    await waitFor(() => {
      expect(router.state.location.search).toBe("?order=asc");
    });
  });
});

describe("PageHome status filter", () => {
  // Same proof as the sorting test: the filter must reach the URL (and the
  // request), not hide rows already fetched. Starting on page 2 makes the
  // reset assertion real — a page number from the unfiltered set is
  // meaningless once the set changes.
  it("writes the chosen status to the URL and resets the page", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));
    const user = userEvent.setup();

    const { router } = renderPageHome("/?page=2", "admin", 2);

    await user.click(await screen.findByRole("combobox", { name: "Filtrar por status" }));
    await user.click(screen.getByRole("option", { name: "Pago" }));

    await waitFor(() => {
      expect(router.state.location.search).toBe("?status=paid");
    });
  });

  // The request itself is what proves the filter is server-side: asserting the
  // rendered rows could pass with a client-side filter over the current page.
  // An admin's Home also fires the separate pending-count request (per_page=1,
  // status=pending) alongside the list — that one is filtered out here by its
  // per_page, so it cannot be mistaken for the list request this test targets.
  it("sends the status to the API", async () => {
    let capturedStatus: string | null = null;
    server.use(
      http.get("*/refunds", ({ request }) => {
        const params = new URL(request.url).searchParams;
        if (params.get("per_page") !== "1") {
          capturedStatus = params.get("status");
        }
        return HttpResponse.json(pagedListResponse());
      })
    );

    renderPageHome("/", "admin", 2, { status: "paid" });

    await waitFor(() => {
      expect(capturedStatus).toBe("paid");
    });
  });
});
