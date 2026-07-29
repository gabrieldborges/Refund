import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryWrapper } from "@/test/utils";
import { useReceipt } from "../hooks/useReceipt";

describe("useReceipt", () => {
  // The query must hand back a Blob carrying the Content-Type the API sent:
  // that type is what the preview branches on to choose <img> or <object>.
  it("returns a Blob typed by the response Content-Type", async () => {
    const { result } = renderHook(() => useReceipt("1"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeInstanceOf(Blob);
    expect(result.current.data?.type).toContain("image/png");
  });

  // A refund belonging to someone else answers 404 — the query must end in
  // error rather than exposing an empty body as if it were a file.
  it("ends in error when the receipt is not found", async () => {
    server.use(
      http.get("*/refunds/:id/receipt", () =>
        HttpResponse.json({ detail: "Refund not found" }, { status: 404 })
      )
    );

    const { result } = renderHook(() => useReceipt("1"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  // Without an id there is nothing to fetch and the query stays disabled.
  it("stays disabled without an id", () => {
    const { result } = renderHook(() => useReceipt(undefined), { wrapper: QueryWrapper });

    expect(result.current.fetchStatus).toBe("idle");
  });
});
