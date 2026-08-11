import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundFixture, refundStatsFixture } from "@/test/msw/handlers";
import { QueryWrapper } from "@/test/utils";
import { REFUNDS_PER_PAGE } from "@/features/refunds";
import type { RefundViewer } from "../lib/getRefundHref";
import RequesterPanel from "./RequesterPanel";

const requester = { id: 2, name: "Bruno Lima" };
const adminViewer: RefundViewer = { id: 99, role: "admin" };

// A list response scoped to `requester`, distinct from the default
// `refundFixture` (id 1, user.id 1) so a test can tell "the requester's own
// refund rendered" apart from "the wrong fixture rendered by coincidence".
function requesterListResponse(overrides: Partial<typeof refundFixture> = {}) {
  const attributes = [
    {
      ...refundFixture,
      id: 5,
      name: "Passagem aérea",
      user: { id: requester.id, name: requester.name, has_avatar: false },
      ...overrides,
    },
  ];
  return {
    type: "Refund",
    count: attributes.length,
    total: attributes.length,
    sum_amount_in_cents: attributes.reduce((sum, refund) => sum + refund.amount_in_cents, 0),
    page: 1,
    per_page: REFUNDS_PER_PAGE,
    total_pages: 1,
    attributes,
  };
}

// Three refunds so a middle position exists: with two rows every position is
// an edge, and "both arrows enabled" could never be observed.
function threeRefundsResponse() {
  const attributes = [10, 20, 30].map((id, index) => ({
    ...refundFixture,
    id,
    name: `Solicitação ${index + 1}`,
    user: { id: requester.id, name: requester.name, has_avatar: false },
  }));
  return {
    type: "Refund",
    count: attributes.length,
    total: attributes.length,
    sum_amount_in_cents: attributes.reduce((sum, refund) => sum + refund.amount_in_cents, 0),
    page: 1,
    per_page: REFUNDS_PER_PAGE,
    total_pages: 1,
    attributes,
  };
}

function renderPanel(viewer: RefundViewer | null = adminViewer, currentRefundId = 5) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        Component: () => (
          <RequesterPanel requester={requester} viewer={viewer} currentRefundId={currentRefundId} />
        ),
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

describe("RequesterPanel", () => {
  it("shows the requester's name", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(requesterListResponse())));
    renderPanel();

    expect(await screen.findByText("Bruno Lima")).toBeInTheDocument();
  });

  // A skeleton must appear while the stats request is in flight — otherwise
  // that brief moment is indistinguishable from a requester who genuinely has
  // zero refunds in every status.
  it("shows a loading placeholder for the counters before stats arrive", () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(requesterListResponse())));
    const { container } = renderPanel();

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  // The five counter cards became a donut chart. The counts are asserted
  // through its accessible name rather than through the SVG: jsdom has no
  // layout engine, so nivo measures the container as 0x0 and draws no slices —
  // but the accessible name is our own markup and carries every number the
  // chart shows, which is exactly the contract a screen reader depends on. A
  // chart whose numbers are only in pixels would fail this test, and should.
  it("shows the four status counts through the chart's accessible name", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(requesterListResponse())));
    renderPanel();

    const chart = await screen.findByRole("img", { name: /Solicitações por status/ });
    const label = chart.getAttribute("aria-label") ?? "";

    expect(label).toContain(`Pendente: ${refundStatsFixture.by_status.pending.count}`);
    expect(label).toContain(`Aprovado: ${refundStatsFixture.by_status.approved.count}`);
    expect(label).toContain(`Pago: ${refundStatsFixture.by_status.paid.count}`);
    expect(label).toContain(`Rejeitado: ${refundStatsFixture.by_status.rejected.count}`);
  });

  // Same gap flagged and fixed on the Home in Task 2: a failed stats request
  // must not silently render as zeros, which would be indistinguishable from
  // a requester who genuinely has nothing in every status.
  it("shows a failure state instead of a false all-zero chart when stats fail to load", async () => {
    server.use(
      http.get("*/refunds", () => HttpResponse.json(requesterListResponse())),
      http.get("*/users/:id/refund-stats", () => HttpResponse.json({}, { status: 500 }))
    );
    renderPanel();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível carregar os dados do gráfico.");
    expect(screen.queryByRole("img", { name: /Solicitações por status/ })).not.toBeInTheDocument();
  });

  // Same reasoning for the refund list: a failed list request must be
  // visibly distinct from "this requester has no refunds".
  //
  // The wording lost "do solicitante" when this message moved into the locale
  // catalogues: the panel that renders it is now shared with the team member
  // page, where the person is not being looked at as the requester of one
  // specific refund. The behaviour under test — an alert, distinct from the
  // empty state — is unchanged; only the copy is more general.
  it("shows a failure state, distinct from empty, when the list fails to load", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json({}, { status: 500 })));
    renderPanel();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível carregar as solicitações.");
  });

  // The bug Task 8's review caught twice: a test must confirm what was
  // actually FETCHED, not just what rendered. Two fixtures could look
  // identical; asserting the query string proves the panel scoped the list
  // request to this requester instead of fetching everyone's refunds.
  it("requests the refund list scoped to the requester's user_id", async () => {
    let capturedUserId: string | null = null;
    server.use(
      http.get("*/refunds", ({ request }) => {
        capturedUserId = new URL(request.url).searchParams.get("user_id");
        return HttpResponse.json(requesterListResponse());
      })
    );

    renderPanel();

    await screen.findByText("Passagem aérea");
    expect(capturedUserId).toBe(String(requester.id));
  });

  // The row must be clickable and follow the SAME destination rule as the
  // Home (Task 4): an admin viewing someone else's refund goes to /review.
  it("links a row to the review route, following the shared destination rule", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(requesterListResponse())));
    renderPanel(adminViewer);

    const row = await screen.findByRole("link", { name: /Passagem aérea/ });
    expect(row).toHaveAttribute("href", "/refunds/5/review");
  });

  // A non-admin viewer (or no viewer at all) must never get a review link,
  // matching getRefundHref's fallback used by the Home for the same case.
  it("links a row to the plain detail route for a non-admin viewer", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(requesterListResponse())));
    renderPanel({ id: 42, role: "standard" });

    const row = await screen.findByRole("link", { name: /Passagem aérea/ });
    expect(row).toHaveAttribute("href", "/refunds/5");
  });

  // The other half of BR-016: role alone is not enough. When the viewer IS
  // the refund's owner, the row must stay on the plain detail page — the
  // same edge case PageHome's row-navigation tests cover for the Home. This
  // is what makes the shared rule's ownership check actually exercised here,
  // not just its role check.
  it("links a row to the plain detail route when the viewer is the refund's own owner", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(requesterListResponse())));
    renderPanel({ id: requester.id, role: "admin" });

    const row = await screen.findByRole("link", { name: /Passagem aérea/ });
    expect(row).toHaveAttribute("href", "/refunds/5");
  });

  it("links to the Home filtered by the requester's name", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(requesterListResponse())));
    renderPanel();

    const homeLink = await screen.findByRole("link", { name: /na Home/i });
    expect(homeLink).toHaveAttribute("href", `/?name=${encodeURIComponent(requester.name)}`);
  });

  // The four per-status counters answer "how is this person's history split";
  // the total answers "how often has this person asked at all". It now lives in
  // the donut's hole instead of its own card. The fixture sums to 11
  // (2 + 5 + 3 + 1), a number none of the four carries, so the assertion cannot
  // pass by accidentally matching one of them.
  it("states the total summing every status", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(requesterListResponse())));
    renderPanel();

    const chart = await screen.findByRole("img", { name: /Solicitações por status/ });
    expect(chart).toHaveAccessibleName(expect.stringContaining("11 solicitações"));
  });

  // aria-current is the half that a screen reader can perceive: the background
  // colour alone tells a sighted user where they are and tells everyone else
  // nothing. Both halves ship together or the highlight is decorative.
  it("marks the current refund's row with aria-current", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(requesterListResponse())));
    renderPanel(adminViewer, 5);

    const row = await screen.findByRole("link", { name: /Passagem aérea/ });
    expect(row).toHaveAttribute("aria-current", "page");
  });

  it("leaves other rows without aria-current", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(requesterListResponse())));
    renderPanel(adminViewer, 999);

    const row = await screen.findByRole("link", { name: /Passagem aérea/ });
    expect(row).not.toHaveAttribute("aria-current");
  });

  // The single-row fixture above can only prove the attribute isn't applied
  // unconditionally — it has no sibling to withhold it from. With three rows,
  // this proves aria-current actually distinguishes the current row from its
  // neighbours, not just from its own absence.
  it("marks only the current row with aria-current among several", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(threeRefundsResponse())));
    renderPanel(adminViewer, 20);

    const current = await screen.findByRole("link", { name: /Solicitação 2/ });
    const first = screen.getByRole("link", { name: /Solicitação 1/ });
    const third = screen.getByRole("link", { name: /Solicitação 3/ });

    expect(current).toHaveAttribute("aria-current", "page");
    expect(first).not.toHaveAttribute("aria-current");
    expect(third).not.toHaveAttribute("aria-current");
  });
});

describe("RequesterPanel navigation arrows", () => {
  it("links each arrow to the neighbouring refund from the middle of the list", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(threeRefundsResponse())));
    renderPanel(adminViewer, 20);

    expect(
      await screen.findByRole("link", { name: "Solicitação anterior deste solicitante" })
    ).toHaveAttribute("href", "/refunds/10/review");
    expect(
      screen.getByRole("link", { name: "Próxima solicitação deste solicitante" })
    ).toHaveAttribute("href", "/refunds/30/review");
  });

  // At an edge the arrow must be a disabled control, not a link to nowhere and
  // not an absent element — a control that vanishes moves the one next to it.
  //
  // Awaits the "next" link first, not the "previous" button: the previous
  // arrow is disabled both before the list loads (no rows yet) and after
  // (refund 10 is genuinely first), so awaiting it would resolve against the
  // pre-load render and race ahead of the list request. The "next" link only
  // exists once the real data has settled, so waiting on it first proves the
  // list has loaded before the synchronous assertion below runs.
  it("disables the previous arrow on the first refund", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(threeRefundsResponse())));
    renderPanel(adminViewer, 10);

    expect(
      await screen.findByRole("link", { name: "Próxima solicitação deste solicitante" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Solicitação anterior deste solicitante" })
    ).toBeDisabled();
  });

  it("disables the next arrow on the last refund", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(threeRefundsResponse())));
    renderPanel(adminViewer, 30);

    expect(
      await screen.findByRole("button", { name: "Próxima solicitação deste solicitante" })
    ).toBeDisabled();
  });

  // The panel loads only the requester's first page (10 items, no pagination
  // by design). A refund beyond it has no position in this list, so there is
  // no meaningful neighbour in either direction — both arrows go inert rather
  // than silently jumping to the first page's edges.
  it("disables both arrows when the current refund is not in the loaded page", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(threeRefundsResponse())));
    renderPanel(adminViewer, 999);

    expect(
      await screen.findByRole("button", { name: "Solicitação anterior deste solicitante" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Próxima solicitação deste solicitante" })
    ).toBeDisabled();
  });
});
