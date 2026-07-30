import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundFixture } from "@/test/msw/handlers";
import { refundKeys, refundListQuery, refundDetailQuery } from "../api/refundQueries";
import type { RefundsListResponse, RefundStatus } from "../schemas/refund";
import { usePayRefund } from "./usePayRefund";

// Builds a list response body from a set of items, mirroring
// useDeleteRefund.test.tsx's / useReviewRefund.test.tsx's helper.
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

describe("usePayRefund", () => {
  // Regression for the pay-refund flow's onSuccess, built on the exact
  // template useReviewRefund.test.tsx already proved for this codebase (see
  // its own comment trail back to useDeleteRefund.ts): Task 5's review caught
  // usePayRefund shipping with no test for this — a narrower key
  // (refundKeys.lists()) or the default refetchType ("active") would both
  // pass the rest of the suite silently. Two queries are stale after a
  // payment: the Home list (inactive while on the review screen) and the
  // paid refund's own detail. usePayRefund must invalidate refundKeys.all —
  // not a narrower prefix — WITH refetchType: "all".
  it("refetches both the inactive list and the paid refund's detail", async () => {
    let serverStatus: RefundStatus = "approved";
    let listCalls = 0;
    let detailCalls = 0;

    server.use(
      http.get("*/refunds", () => {
        listCalls += 1;
        const paid = { ...refundFixture, id: 1, status: serverStatus };
        return HttpResponse.json(listBody([paid]));
      }),
      http.get("*/refunds/:id", ({ params }) => {
        detailCalls += 1;
        return HttpResponse.json({
          type: "Refund",
          count: 1,
          attributes: { ...refundFixture, id: Number(params.id), status: serverStatus },
        });
      }),
      http.post("*/refunds/:id/payment", () => {
        // Mirrors the real API: the payment lands before the client refetches.
        serverStatus = "paid";
        return new HttpResponse(null, { status: 200 });
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
    const { result } = renderHook(() => usePayRefund(), { wrapper });

    // `file` is typed as FileList in the app, but the hook only reads file[0]
    // to build FormData, so an array with one File is enough at runtime
    // (cast for the compiler) — same approach as useCreateRefund.test.tsx's
    // validData.
    const file = [new File(["dummy"], "comprovante.png", { type: "image/png" })] as unknown as FileList;

    await act(async () => {
      await result.current.mutateAsync({ id: "1", file });
    });

    // Both refetched despite neither having an active observer — proof that
    // refetchType: "all" (not the default "active") is in effect, and that
    // the invalidated key is refundKeys.all (covers detail too), not just
    // refundKeys.lists().
    await waitFor(() => expect(listCalls).toBe(2));
    await waitFor(() => expect(detailCalls).toBe(2));

    const listData = qc.getQueryData<RefundsListResponse>(refundKeys.list(params));
    expect(listData?.attributes[0]?.status).toBe("paid");
  });
});
