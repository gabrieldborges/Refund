import { describe, it, expect, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import type { LoaderFunctionArgs } from "react-router";
import { server } from "@/test/msw/server";
import { homeLoader } from "./router-loaders";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "@/lib/api";
import { queryClient } from "@/lib/query-client";

function isRedirectTo(value: unknown, location: string): boolean {
  return (
    value instanceof Response &&
    value.status >= 300 &&
    value.status < 400 &&
    value.headers.get("Location") === location
  );
}

// Only `request` matters to homeLoader (it reads request.url); the rest of
// LoaderFunctionArgs is internal react-router plumbing the real router fills
// in and this unit test has no reason to fabricate.
function makeArgs(url = "http://localhost/"): LoaderFunctionArgs {
  return { request: new Request(url) } as LoaderFunctionArgs;
}

describe("requireSession (exercised through homeLoader)", () => {
  afterEach(() => {
    queryClient.clear();
  });

  // Regression test for the forced-logout deploy: a session saved before the
  // `id` field existed is valid JSON but fails storedUserSchema. Before this
  // fix, requireSession only checked presence, so this stale session slipped
  // past the guard, homeLoader went on to fire a real authenticated request,
  // and only ProtectedRoute (rendered afterwards) caught the missing user —
  // by which point the stale token/user were still sitting in localStorage,
  // since nothing had called logout().
  it("redirects to /login, wipes both storage keys, and never requests the refund list", async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, "stale-token");
    // Valid JSON, but missing `id` — the shape a session had before the field
    // was introduced.
    localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({ name: "Ana", email: "ana@exemplo.com", role: "standard" })
    );

    let refundListRequests = 0;
    server.use(
      http.get("*/refunds", () => {
        refundListRequests += 1;
        return HttpResponse.json({
          type: "Refund",
          count: 0,
          total: 0,
          sum_amount_in_cents: 0,
          page: 1,
          per_page: 10,
          total_pages: 0,
          attributes: [],
        });
      })
    );

    let caught: unknown;
    try {
      await homeLoader(makeArgs());
    } catch (error) {
      caught = error;
    }

    expect(isRedirectTo(caught, "/login")).toBe(true);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull();
    expect(refundListRequests).toBe(0);
    // Belt-and-suspenders: ensureQueryData never ran, so nothing landed in
    // the shared cache for anyone to read later.
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  // Existing behaviour (missing token) must be unchanged by the new check.
  it("still redirects to /login when there is no token at all", async () => {
    localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({ id: 1, name: "Ana", email: "ana@exemplo.com", role: "standard" })
    );

    let caught: unknown;
    try {
      await homeLoader(makeArgs());
    } catch (error) {
      caught = error;
    }

    expect(isRedirectTo(caught, "/login")).toBe(true);
  });
});
