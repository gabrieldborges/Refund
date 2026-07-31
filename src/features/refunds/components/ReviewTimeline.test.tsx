import { describe, it, expect } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundReviewsFixture } from "@/test/msw/handlers";
import { QueryWrapper } from "@/test/utils";
import ReviewTimeline from "./ReviewTimeline";

function renderTimeline() {
  return render(
    <QueryWrapper>
      <ReviewTimeline refundId="1" />
    </QueryWrapper>
  );
}

describe("ReviewTimeline", () => {
  // A skeleton must appear while the request is in flight — otherwise the
  // brief moment before data arrives is indistinguishable from the
  // permanently-empty (never reviewed) state.
  it("renders a loading placeholder while the request is in flight", () => {
    const { container } = renderTimeline();

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(screen.queryByText("Histórico")).not.toBeInTheDocument();
  });

  // The one thing this whole feature exists for: a rejection's reason,
  // reviewer and date must all render together.
  it("renders a rejection's reason, reviewer and date", async () => {
    renderTimeline();

    const reason = await screen.findByText("Comprovante ilegível");
    const entry = reason.closest("li");
    expect(entry).not.toBeNull();

    const rejection = refundReviewsFixture.find((review) => review.to_status === "rejected")!;
    const expectedDate = new Date(rejection.created_at).toLocaleDateString("pt-BR");

    expect(within(entry!).getByText(rejection.reviewer.name)).toBeInTheDocument();
    expect(within(entry!).getByText(expectedDate)).toBeInTheDocument();
  });

  // Entries with a null reason (approval, payment) must not render a reason
  // paragraph — only rejections carry one (BR-018).
  it("does not render a reason for an approval or a payment", async () => {
    renderTimeline();

    const approvedBadge = await screen.findByText("Aprovado");
    const approvedEntry = approvedBadge.closest("li");
    expect(approvedEntry).not.toBeNull();
    // The only <p> this entry should contain is the reviewer's name — no
    // reason paragraph, since this entry's `reason` is null.
    expect(approvedEntry!.querySelectorAll("p")).toHaveLength(1);
    expect(within(approvedEntry!).getByText("Gabriel")).toBeInTheDocument();
  });

  // BR/UC-013: an undecided refund's history is an empty list, a 200, not an
  // error — the component must render nothing at all, no heading, no box.
  it("renders nothing for a refund that was never reviewed", async () => {
    server.use(
      http.get("*/refunds/:id/reviews", () =>
        HttpResponse.json({ type: "RefundReview", count: 0, attributes: [] })
      )
    );

    const { container } = renderTimeline();

    await waitFor(() =>
      expect(container.querySelector('[data-slot="skeleton"]')).not.toBeInTheDocument()
    );

    expect(container).toBeEmptyDOMElement();
  });

  // The error branch must be distinguishable from the empty-history branch
  // above: silently rendering nothing on failure would look identical to a
  // refund nobody has reviewed yet.
  it("shows an error message, distinct from the empty state, when the request fails", async () => {
    server.use(
      http.get("*/refunds/:id/reviews", () => HttpResponse.json({}, { status: 500 }))
    );

    const { container } = renderTimeline();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o histórico da solicitação."
    );
    expect(container).not.toBeEmptyDOMElement();
  });

  // Most recent first. The response below is chronological — oldest to newest,
  // which is what UC-013 says the API returns — so "renders the last entry
  // first" and "renders the most recent first" are the same statement here.
  // The shared refundReviewsFixture is NOT chronological, which is why this
  // test does not use it.
  it("shows the most recent decision first", async () => {
    server.use(
      http.get("*/refunds/:id/reviews", () =>
        HttpResponse.json({
          type: "RefundReview",
          count: 2,
          attributes: [
            {
              from_status: "pending",
              to_status: "approved",
              reason: null,
              reviewer: { id: 1, name: "Gabriel" },
              created_at: "2026-07-30T10:00:00.000Z",
            },
            {
              from_status: "approved",
              to_status: "paid",
              reason: null,
              reviewer: { id: 1, name: "Gabriel" },
              created_at: "2026-07-30T14:20:00.000Z",
            },
          ],
        })
      )
    );

    renderTimeline();

    const entries = await screen.findAllByRole("listitem");
    expect(entries[0]).toHaveTextContent("Pago");
    expect(entries[1]).toHaveTextContent("Aprovado");
  });
});
