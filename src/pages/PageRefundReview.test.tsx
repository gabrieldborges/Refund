import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundFixture } from "@/test/msw/handlers";
import { QueryWrapper } from "@/test/utils";
import PageRefundReview from "./PageRefundReview";

// Mirrors renderPageRefundDetails in PageRefundDetails.test.tsx. The real
// reviewLoader guard (admin-only) lives in router.tsx and is out of scope
// here — this page component itself only needs the refund id from the URL.
function renderPageRefundReview() {
  const router = createMemoryRouter([{ path: "/refunds/:id/review", Component: PageRefundReview }], {
    initialEntries: ["/refunds/1/review"],
  });

  return render(
    <QueryWrapper>
      <RouterProvider router={router} />
    </QueryWrapper>
  );
}

describe("PageRefundReview", () => {
  // The API has no has_payment_receipt field: a "paid" status is itself the
  // proof the file exists, so the review screen must show it exactly then —
  // same rule as PageRefundDetails.
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

    expect(
      await screen.findByRole("img", { name: `Comprovante de pagamento de ${refundFixture.name}` })
    ).toBeInTheDocument();
  });

  // A pending refund was never paid, so the payment-receipt endpoint would
  // 404 for it — the review screen must not even ask.
  it("does not render the payment receipt when the refund is not paid", async () => {
    renderPageRefundReview();

    await screen.findByText(refundFixture.name);
    expect(
      screen.queryByRole("img", { name: `Comprovante de pagamento de ${refundFixture.name}` })
    ).not.toBeInTheDocument();
  });
});
