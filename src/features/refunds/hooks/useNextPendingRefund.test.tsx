import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundFixture } from "@/test/msw/handlers";
import { QueryWrapper } from "@/test/utils";
import type { RefundViewer } from "../lib/getRefundHref";
import { useNextPendingRefund } from "./useNextPendingRefund";

const admin: RefundViewer = { id: 99, role: "admin" };

function pendingListResponse(
  entries: Array<{ id: number; userId: number }>
) {
  const attributes = entries.map(({ id, userId }) => ({
    ...refundFixture,
    id,
    status: "pending",
    user: { id: userId, name: `Pessoa ${userId}`, has_avatar: false },
  }));
  return {
    type: "Refund",
    count: attributes.length,
    total: attributes.length,
    sum_amount_in_cents: attributes.reduce((sum, refund) => sum + refund.amount_in_cents, 0),
    page: 1,
    per_page: 10,
    total_pages: 1,
    attributes,
  };
}

function renderNextPending(currentRefundId: number, viewer: RefundViewer | null = admin) {
  return renderHook(() => useNextPendingRefund(currentRefundId, viewer), {
    wrapper: QueryWrapper,
  });
}

describe("useNextPendingRefund", () => {
  // The queue must be requested oldest-first and restricted to pending. This
  // asserts what was FETCHED, not what was returned: a hook that fetched the
  // whole list and picked the first pending row would produce the same value
  // here while paging through everyone's refunds.
  it("asks the API for the oldest pending refunds", async () => {
    let captured: URLSearchParams | null = null;
    server.use(
      http.get("*/refunds", ({ request }) => {
        captured = new URL(request.url).searchParams;
        return HttpResponse.json(pendingListResponse([{ id: 1, userId: 1 }]));
      })
    );

    renderNextPending(999);

    await waitFor(() => expect(captured).not.toBeNull());
    expect(captured!.get("status")).toBe("pending");
    expect(captured!.get("sort")).toBe("created_at");
    expect(captured!.get("order")).toBe("asc");
  });

  it("returns the oldest pending refund", async () => {
    server.use(
      http.get("*/refunds", () =>
        HttpResponse.json(pendingListResponse([{ id: 7, userId: 1 }, { id: 8, userId: 2 }]))
      )
    );

    const { result } = renderNextPending(999);

    await waitFor(() => expect(result.current.nextRefund?.id).toBe(7));
  });

  // "Next" must mean a different refund. Without this the button would point
  // at the screen the admin is already on.
  it("skips the refund currently open", async () => {
    server.use(
      http.get("*/refunds", () =>
        HttpResponse.json(pendingListResponse([{ id: 7, userId: 1 }, { id: 8, userId: 2 }]))
      )
    );

    const { result } = renderNextPending(7);

    await waitFor(() => expect(result.current.nextRefund?.id).toBe(8));
  });

  // BR-016: an admin may not review their own refund, and reviewLoader
  // redirects away from it. A button that lands on a redirect is a broken
  // promise, so the admin's own refunds are skipped here.
  it("skips the admin's own refunds", async () => {
    server.use(
      http.get("*/refunds", () =>
        HttpResponse.json(pendingListResponse([{ id: 7, userId: admin.id }, { id: 8, userId: 2 }]))
      )
    );

    const { result } = renderNextPending(999);

    await waitFor(() => expect(result.current.nextRefund?.id).toBe(8));
  });

  it("returns nothing when no pending refund is eligible", async () => {
    server.use(
      http.get("*/refunds", () => HttpResponse.json(pendingListResponse([{ id: 7, userId: admin.id }])))
    );

    const { result } = renderNextPending(999);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.nextRefund).toBeNull();
  });
});
