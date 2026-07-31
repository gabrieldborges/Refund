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

function renderPanel(viewer: RefundViewer | null = adminViewer) {
  const router = createMemoryRouter(
    [{ path: "/", Component: () => <RequesterPanel requester={requester} viewer={viewer} /> }],
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

  it("shows the four status counters from the stats endpoint", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(requesterListResponse())));
    renderPanel();

    expect(
      await screen.findByText(String(refundStatsFixture.by_status.pending.count))
    ).toBeInTheDocument();
    expect(screen.getByText(String(refundStatsFixture.by_status.approved.count))).toBeInTheDocument();
    expect(screen.getByText(String(refundStatsFixture.by_status.paid.count))).toBeInTheDocument();
    expect(screen.getByText(String(refundStatsFixture.by_status.rejected.count))).toBeInTheDocument();
  });

  // Same gap flagged and fixed on the Home in Task 2: a failed stats request
  // must not silently render as zeros, which would be indistinguishable from
  // a requester who genuinely has nothing in every status.
  it("shows a failure state instead of false zero counters when stats fail to load", async () => {
    server.use(
      http.get("*/refunds", () => HttpResponse.json(requesterListResponse())),
      http.get("*/users/:id/refund-stats", () => HttpResponse.json({}, { status: 500 }))
    );
    renderPanel();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível carregar as estatísticas do solicitante.");
    expect(screen.queryByText(String(refundStatsFixture.by_status.pending.count))).not.toBeInTheDocument();
  });

  // Same reasoning for the refund list: a failed list request must be
  // visibly distinct from "this requester has no refunds".
  it("shows a failure state, distinct from empty, when the list fails to load", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json({}, { status: 500 })));
    renderPanel();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível carregar as solicitações do solicitante.");
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
  // the total answers "how often has this person asked at all". The fixture
  // sums to 11 (2 + 5 + 3 + 1), a number none of the four carries, so the
  // assertion cannot pass by accidentally matching one of them.
  it("shows a total counter summing every status", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(requesterListResponse())));
    renderPanel();

    expect(await screen.findByText("Total")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
  });

  // A failed stats request must not render a total of 0 — same reasoning as
  // the four counters it is derived from.
  it("hides the total when stats fail to load", async () => {
    server.use(
      http.get("*/refunds", () => HttpResponse.json(requesterListResponse())),
      http.get("*/users/:id/refund-stats", () => HttpResponse.json({}, { status: 500 }))
    );
    renderPanel();

    await screen.findByRole("alert");
    expect(screen.queryByText("Total")).not.toBeInTheDocument();
  });
});
