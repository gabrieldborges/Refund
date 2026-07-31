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
function renderPageRefundReview() {
  seedSession();
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
