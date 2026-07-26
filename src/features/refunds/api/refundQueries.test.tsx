import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw/server";
import { refundFixture } from "../../../test/msw/handlers";
import { QueryWrapper } from "../../../test/utils";
import { useRefunds } from "../hooks/useRefunds";
import { useRefund } from "../hooks/useRefund";

// These tests finally exercise the response schemas from Item 2: the real axios
// request runs, MSW returns a body, and the Zod schema parses it at the
// boundary. A malformed body must be rejected instead of reaching the cache.

describe("useRefunds", () => {
  // Happy path: a valid list response is parsed and exposed as data.
  it("parses a valid list response", async () => {
    const { result } = renderHook(() => useRefunds({ page: 1 }), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.attributes[0].name).toBe(refundFixture.name);
  });

  // Boundary: a response missing required fields fails the schema, so the query
  // ends in error instead of caching invalid data.
  it("rejects a malformed list response", async () => {
    server.use(
      http.get("*/refunds", () => HttpResponse.json({ type: "Refund", attributes: "nope" }))
    );
    const { result } = renderHook(() => useRefunds({ page: 1 }), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useRefund", () => {
  // Happy path: the detail response is parsed and the id is echoed back.
  it("parses a valid detail response", async () => {
    const { result } = renderHook(() => useRefund("7"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe(7);
  });

  // Boundary: a malformed detail response is rejected.
  it("rejects a malformed detail response", async () => {
    server.use(
      http.get("*/refunds/:id", () => HttpResponse.json({ type: "Refund", count: 1 }))
    );
    const { result } = renderHook(() => useRefund("7"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
