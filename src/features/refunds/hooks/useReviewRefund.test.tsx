import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundFixture } from "@/test/msw/handlers";
import { refundKeys, refundListQuery, refundDetailQuery } from "../api/refundQueries";
import type { RefundsListResponse, RefundStatus } from "../schemas/refund";
import { QueryWrapper } from "@/test/utils";
import { useReviewRefund } from "./useReviewRefund";
import { useRefund } from "./useRefund";

// Builds a list response body from a set of items, mirroring
// useDeleteRefund.test.tsx's helper.
function listBody(items: Array<{ name: string; amount_in_cents: number }>) {
  return {
    type: "Refund",
    count: items.length,
    total: items.length,
    sum_amount_in_cents: items.reduce((sum, item) => sum + item.amount_in_cents, 0),
    page: 1,
    per_page: 6,
    total_pages: 1,
    attributes: items,
  };
}

describe("useReviewRefund", () => {
  // Regression for the review flow's onSuccess. This is the one piece of
  // logic in this task with a documented history of being gotten wrong in
  // this codebase — see the comment trail in useDeleteRefund.ts, which exists
  // because a narrower invalidation shipped once. Two queries are commonly
  // stale after a review: the Home list (inactive while reviewing) and the
  // reviewed refund's own detail. useReviewRefund must invalidate
  // refundKeys.all — not a narrower prefix — WITH refetchType: "all": the
  // default ("active") only refetches queries with a live observer, so an
  // inactive list would keep showing the pre-review status for up to
  // staleTime.
  it("refetches both the inactive list and the reviewed refund's detail", async () => {
    let serverStatus: RefundStatus = "pending";
    let listCalls = 0;
    let detailCalls = 0;

    server.use(
      http.get("*/refunds", () => {
        listCalls += 1;
        const reviewed = { ...refundFixture, id: 1, status: serverStatus };
        return HttpResponse.json(listBody([reviewed]));
      }),
      http.get("*/refunds/:id", ({ params }) => {
        detailCalls += 1;
        return HttpResponse.json({
          type: "Refund",
          count: 1,
          attributes: { ...refundFixture, id: Number(params.id), status: serverStatus },
        });
      }),
      http.patch("*/refunds/:id/status", () => {
        // Mirrors the real API: the decision lands before the client refetches.
        serverStatus = "approved";
        return HttpResponse.json({ id: 1, status: "approved" });
      })
    );

    // Mirror the app's client: staleTime keeps just-fetched data "fresh by time".
    const qc = new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000, retry: false }, mutations: { retry: false } },
    });
    const params = { page: 1, perPage: 6, name: undefined };

    // Both queries are fetched once via ensureQueryData, which does not
    // subscribe an observer — exactly like the Home list once its page is
    // left, and like the review screen's own detail query once unmounted.
    // Both are therefore INACTIVE from this point on.
    await qc.ensureQueryData(refundListQuery(params));
    await qc.ensureQueryData(refundDetailQuery("1"));
    expect(listCalls).toBe(1);
    expect(detailCalls).toBe(1);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useReviewRefund(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "1", status: "approved" });
    });

    // Both refetched despite neither having an active observer — proof that
    // refetchType: "all" (not the default "active") is in effect, and that
    // the invalidated key is refundKeys.all (covers detail too), not just
    // refundKeys.lists().
    await waitFor(() => expect(listCalls).toBe(2));
    await waitFor(() => expect(detailCalls).toBe(2));

    const listData = qc.getQueryData<RefundsListResponse>(refundKeys.list(params));
    expect(listData?.attributes[0]?.status).toBe("approved");
  });

  // A mutation's pending state must cover the refetches it triggers, not just
  // its own HTTP call. Without this, the UI says "done" while the screen still
  // shows stale data — the exact bug this task fixes. The gate below holds the
  // refetch open so the two moments are observably different.
  it("stays pending until the invalidated queries have refetched", async () => {
    let releaseRefetch!: () => void;
    const refetchGate = new Promise<void>((resolve) => {
      releaseRefetch = resolve;
    });
    let patchResolved = false;
    let refetchStarted = false;

    server.use(
      http.patch("*/refunds/:id/status", () => {
        patchResolved = true;
        return new HttpResponse(null, { status: 204 });
      }),
      http.get("*/refunds/:id", async ({ params }) => {
        // The first call is the initial load; only gate the refetch.
        if (refetchStarted) await refetchGate;
        refetchStarted = true;
        return HttpResponse.json({
          type: "Refund",
          count: 1,
          attributes: { ...refundFixture, id: Number(params.id) },
        });
      })
    );

    const { result } = renderHook(
      () => ({ detail: useRefund("1"), review: useReviewRefund() }),
      { wrapper: QueryWrapper }
    );

    // An ACTIVE query must exist, or there is nothing for the invalidation to
    // wait on and the test would pass either way.
    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));

    result.current.review.mutate({ id: "1", status: "approved" });

    await waitFor(() => expect(patchResolved).toBe(true));
    // The HTTP call is done; the screen is not updated yet. This is the
    // assertion the old code fails.
    expect(result.current.review.isPending).toBe(true);

    releaseRefetch();
    await waitFor(() => expect(result.current.review.isPending).toBe(false));
  });
});
