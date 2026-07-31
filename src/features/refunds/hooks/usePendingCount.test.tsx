import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryWrapper } from "@/test/utils";
import { REFUNDS_PER_PAGE } from "@/features/refunds";
import { usePendingCount } from "./usePendingCount";

function emptyListResponse() {
  return {
    type: "Refund",
    count: 0,
    total: 0,
    sum_amount_in_cents: 0,
    page: 1,
    per_page: REFUNDS_PER_PAGE,
    total_pages: 0,
    attributes: [],
  };
}

describe("usePendingCount", () => {
  // The count must come from a query of its own, with fixed params — never from
  // the Home's list. Asserting the outgoing request is what proves it: a hook
  // that read the list's `total` would return the filtered number and this test
  // would catch it.
  it("asks for pending refunds with a one-row page", async () => {
    let captured: URLSearchParams | null = null;
    server.use(
      http.get("*/refunds", ({ request }) => {
        captured = new URL(request.url).searchParams;
        return HttpResponse.json({ ...emptyListResponse(), total: 7 });
      })
    );

    const { result } = renderHook(() => usePendingCount(true), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.count).toBe(7));
    expect(captured!.get("status")).toBe("pending");
    expect(captured!.get("per_page")).toBe("1");
  });

  // A standard user must not fire this request at all — their number comes from
  // refund-stats, which is already scoped to them.
  it("does not request anything when disabled", async () => {
    let called = false;
    server.use(
      http.get("*/refunds", () => {
        called = true;
        return HttpResponse.json(emptyListResponse());
      })
    );

    const { result } = renderHook(() => usePendingCount(false), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(called).toBe(false);
    expect(result.current.count).toBeUndefined();
  });
});
