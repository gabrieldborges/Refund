import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundFixture, refundStatsFixture } from "@/test/msw/handlers";
import { QueryWrapper } from "@/test/utils";
import { AuthProvider } from "@/context/AuthContext";
import { USER_STORAGE_KEY } from "@/lib/api";
import PageRefundReview from "./PageRefundReview";

// Mirrors renderPageHome's seedSession in PageHome.test.tsx. id defaults to
// 99 — different from refundFixture.user.id (1) — since PageRefundReview now
// mounts RequesterPanel, which needs a real admin viewer distinct from the
// refund's owner (an admin reviewing their own refund never reaches this
// page; reviewLoader redirects it away).
function seedSession(id = 99) {
  localStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify({ id, name: "Gabriel", email: "gabriel@exemplo.com", role: "admin" })
  );
}

// Mirrors renderPageRefundDetails in PageRefundDetails.test.tsx. The real
// reviewLoader guard (admin-only) lives in router.tsx and is out of scope
// here — this page component itself only needs the refund id from the URL.
// AuthProvider is real (not stubbed) because PageRefundReview now reads the
// logged-in admin via useAuth() to pass as RequesterPanel's `viewer`.
//
// `overrides` lets a test render a refund whose status differs from the
// fixture's default "pending" — e.g. "paid", so both receipts are on screen
// at once — without duplicating the server.use(...) plumbing per test.
function renderPageRefundReview(overrides?: { status?: (typeof refundFixture)["status"] }) {
  seedSession();

  if (overrides?.status) {
    server.use(
      http.get("*/refunds/:id", () =>
        HttpResponse.json({
          type: "Refund",
          count: 1,
          attributes: { ...refundFixture, status: overrides.status },
        })
      )
    );
  }

  const router = createMemoryRouter([{ path: "/refunds/:id/review", Component: PageRefundReview }], {
    initialEntries: ["/refunds/1/review"],
  });

  return render(
    <QueryWrapper>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryWrapper>
  );
}

describe("PageRefundReview", () => {
  // The API has no has_payment_receipt field: a "paid" status is itself the
  // proof the file exists, so the review screen must show it exactly then —
  // same rule as PageRefundDetails.
  //
  // The default MSW fixtures (msw/handlers.ts) serve a PNG from /receipt and
  // a PDF from /payment-receipt on purpose. A link only appears here if the
  // payment-receipt endpoint was genuinely hit — if useReceipt silently
  // ignored `kind` and always called receiptQuery, no such link would ever
  // render, even though a "Comprovante de pagamento" label was still shown
  // somewhere via a plain <img>.
  it("renders the payment receipt when the refund is paid", async () => {
    server.use(
      http.get("*/refunds/:id", () =>
        HttpResponse.json({
          type: "Refund",
          count: 1,
          attributes: { ...refundFixture, status: "paid" },
        })
      )
    );

    renderPageRefundReview();

    expect(await screen.findByRole("link", { name: "Abrir comprovante" })).toBeInTheDocument();
    expect(
      screen.getByTitle(`Comprovante de pagamento de ${refundFixture.name}`)
    ).toBeInTheDocument();
  });

  // A refund that never had a payment made must not show the preview — for
  // every non-paid status, not just the fixture's default "pending". A gate
  // like `status !== "pending"` would wrongly show it for "approved" and
  // "rejected" too, and a test that only tried "pending" would miss that.
  it.each(["pending", "approved", "rejected"] as const)(
    "does not render the payment receipt when the refund is %s",
    async (status) => {
      server.use(
        http.get("*/refunds/:id", () =>
          HttpResponse.json({
            type: "Refund",
            count: 1,
            attributes: { ...refundFixture, status },
          })
        )
      );

      renderPageRefundReview();

      await screen.findByText(refundFixture.name);
      expect(screen.queryByRole("link", { name: "Abrir comprovante" })).not.toBeInTheDocument();
      expect(
        screen.queryByTitle(`Comprovante de pagamento de ${refundFixture.name}`)
      ).not.toBeInTheDocument();
    }
  );

  // Task 7's review flagged that no page-level test asserted ReviewTimeline
  // was actually mounted, only that its own component tests passed —
  // deleting it from the page would still have left the suite green. Cover
  // the same gap here: RequesterPanel must be genuinely wired into this page,
  // not just exist as a standalone component.
  it("wires RequesterPanel in, showing the requester's name and status counters", async () => {
    renderPageRefundReview();

    expect(await screen.findByText(refundFixture.user.name)).toBeInTheDocument();
    expect(
      await screen.findByText(String(refundStatsFixture.by_status.pending.count))
    ).toBeInTheDocument();
  });
});

describe("PageRefundReview pending queue", () => {
  it("links the queue button to the next eligible pending refund", async () => {
    // A pending list whose first entry is a different refund from a different
    // person — the one the button must land on.
    server.use(
      http.get("*/refunds", () =>
        HttpResponse.json({
          type: "Refund",
          count: 1,
          total: 1,
          sum_amount_in_cents: 4500,
          page: 1,
          per_page: 10,
          total_pages: 1,
          attributes: [
            { ...refundFixture, id: 42, status: "pending", user: { id: 3, name: "Carla", has_avatar: false } },
          ],
        })
      )
    );

    renderPageRefundReview();

    expect(await screen.findByRole("link", { name: "Próxima pendente" })).toHaveAttribute(
      "href",
      "/refunds/42/review"
    );
  });

  // Disabled, not absent: a button that disappears leaves the admin unable to
  // tell "the queue is empty" from "the screen is broken".
  it("disables the queue button when the queue has nothing eligible", async () => {
    server.use(
      http.get("*/refunds", () =>
        HttpResponse.json({
          type: "Refund",
          count: 0,
          total: 0,
          sum_amount_in_cents: 0,
          page: 1,
          per_page: 10,
          total_pages: 0,
          attributes: [],
        })
      )
    );

    renderPageRefundReview();

    expect(await screen.findByRole("button", { name: "Próxima pendente" })).toBeDisabled();
  });
});

describe("PageRefundReview receipts", () => {
  // The admin approves or rejects based on the expense receipt. Showing only
  // the payment receipt means deciding without the document that justifies
  // the request — the detail page has shown both all along.
  it("shows the expense receipt so the admin can judge the request", async () => {
    renderPageRefundReview();

    expect(
      await screen.findByRole("button", { name: "Ver comprovante em tela cheia" })
    ).toBeInTheDocument();
  });

  // On a paid refund BOTH receipts are on screen. The accessible names must
  // stay distinct, or a screen reader user hears the same button twice and
  // cannot tell which file each one opens.
  it("shows both receipts, with distinct accessible names, on a paid refund", async () => {
    renderPageRefundReview({ status: "paid" });

    expect(
      await screen.findByRole("button", { name: "Ver comprovante em tela cheia" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ver comprovante de pagamento em tela cheia" })
    ).toBeInTheDocument();
  });
});
