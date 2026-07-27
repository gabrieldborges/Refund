import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundFixture } from "@/test/msw/handlers";
import { refundKeys, refundListQuery, refundDetailQuery } from "../api/refundQueries";
import type { RefundsListResponse } from "../schemas/refund";
import { useDeleteRefund } from "./useDeleteRefund";

// Builds a list response body from a set of items.
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

// Reads the cached list names for the given query key.
function cachedNames(qc: QueryClient, params: Parameters<typeof refundListQuery>[0]) {
  const data = qc.getQueryData<RefundsListResponse>(refundKeys.list(params));
  return data?.attributes.map((r) => r.name);
}

describe("useDeleteRefund", () => {
  // Regression for the delete-from-detail flow. Two guarantees:
  // (A) the Home list — inactive while on the detail page — must refresh, so the
  //     deleted item stops showing. The default refetchType ("active") would
  //     leave the inactive list stale (staleTime hides it for up to 30s).
  // (B) the detail query of the DELETED item must NOT be refetched. Invalidating
  //     the whole ["refunds"] key would refetch GET /refunds/:id for an id that
  //     no longer exists, which the real backend answers with errors.
  it("refreshes the list but does not refetch the deleted detail", async () => {
    const A = { ...refundFixture, id: 1, name: "A" };
    const B = { ...refundFixture, id: 2, name: "B" };
    let serverItems = [A, B];
    let detailCalls = 0;
    server.use(
      http.get("*/refunds", () => HttpResponse.json(listBody(serverItems))),
      http.get("*/refunds/:id", ({ params }) => {
        detailCalls += 1;
        return HttpResponse.json({
          type: "Refund",
          count: 1,
          attributes: { ...B, id: Number(params.id) },
        });
      })
    );

    // Mirror the app's client: staleTime keeps just-fetched data "fresh by time".
    const qc = new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000, retry: false }, mutations: { retry: false } },
    });
    const params = { page: 1, perPage: 6, name: undefined };

    // The Home was visited (list cached), then the detail of B was opened.
    await qc.ensureQueryData(refundListQuery(params));
    await qc.ensureQueryData(refundDetailQuery("2"));
    expect(cachedNames(qc, params)).toEqual(["A", "B"]);
    expect(detailCalls).toBe(1);

    // The server no longer has B.
    serverItems = [A];

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useDeleteRefund(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("2");
    });

    // (A) the inactive list refreshed without its own observer.
    await waitFor(() => expect(cachedNames(qc, params)).toEqual(["A"]));
    // (B) the deleted item's detail was never refetched.
    expect(detailCalls).toBe(1);
  });
});
