import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import type { LoaderFunctionArgs } from "react-router";
import { server } from "@/test/msw/server";
import { homeLoader, reviewLoader } from "./router-loaders";
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

// Only `params.id` matters to reviewLoader; same reasoning as makeArgs above.
function makeParamsArgs(id: string): LoaderFunctionArgs {
  return { params: { id } } as unknown as LoaderFunctionArgs;
}

function setStoredSession(user: { id: number; role: "standard" | "admin" }) {
  localStorage.setItem(TOKEN_STORAGE_KEY, "fake-token");
  localStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify({ id: user.id, name: "Sessão de teste", email: "teste@exemplo.com", role: user.role })
  );
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

// UI authorization is usability, not security — the backend's 403/404 is what
// protects the data. The loader simply avoids offering what would be refused.
describe("reviewLoader", () => {
  afterEach(() => {
    queryClient.clear();
  });

  // refundFixture.user.id is 1; the detail handler echoes the requested id
  // into `attributes.id` but leaves `user` (the owner) untouched.
  it("redirects a standard user away from the review route", async () => {
    setStoredSession({ id: 2, role: "standard" });

    let caught: unknown;
    try {
      await reviewLoader(makeParamsArgs("1"));
    } catch (error) {
      caught = error;
    }

    expect(isRedirectTo(caught, "/refunds/1")).toBe(true);
  });

  it("redirects an admin away from reviewing their own refund", async () => {
    // Session id matches refundFixture.user.id (1): the reviewer is the owner.
    setStoredSession({ id: 1, role: "admin" });

    let caught: unknown;
    try {
      await reviewLoader(makeParamsArgs("1"));
    } catch (error) {
      caught = error;
    }

    expect(isRedirectTo(caught, "/refunds/1")).toBe(true);
  });

  it("lets an admin review someone else's refund", async () => {
    // Session id (2) differs from refundFixture.user.id (1): the reviewer is
    // not the owner.
    setStoredSession({ id: 2, role: "admin" });

    const result = await reviewLoader(makeParamsArgs("1"));

    expect(result).toEqual({ id: "1" });
  });
});

// homeLoader calls requireSession() first, so every test needs a session that
// passes storedUserSchema (id included — a session without it is treated as
// logged out and redirected to /login).
function seedSession() {
  localStorage.setItem(TOKEN_STORAGE_KEY, "fake-jwt-token");
  localStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify({ id: 1, name: "Ana Souza", email: "ana@exemplo.com", role: "admin" })
  );
}

// The loader throws a redirect Response for a URL it wants normalized. Running
// it inside try/catch is what lets a test read the Location header instead of
// the returned params.
async function runLoader(url: string) {
  try {
    const data = await homeLoader({
      request: new Request(url),
      params: {},
      context: {} as never,
    } as unknown as LoaderFunctionArgs);
    return { data, redirectedTo: null as string | null };
  } catch (thrown) {
    if (thrown instanceof Response) {
      return { data: null, redirectedTo: thrown.headers.get("Location") };
    }
    throw thrown;
  }
}

describe("homeLoader query params", () => {
  beforeEach(() => {
    seedSession();
    server.use(
      http.get("*/refunds", () =>
        HttpResponse.json({
          type: "Refund",
          count: 0,
          total: 0,
          sum_amount_in_cents: 0,
          page: 1,
          per_page: 10,
          total_pages: 0,
          attributes: [],
        })
      )
    );
  });

  // A default written in the URL is noise: it makes two URLs that mean the
  // same thing look different, and breaks the "shared link = same view"
  // property the Item 3 normalization established for page and name.
  it("redirects away a sort and order that are already the defaults", async () => {
    const { redirectedTo } = await runLoader("http://localhost/?sort=created_at&order=desc");

    expect(redirectedTo).toBe("/");
  });

  it("keeps a non-default sort and order in the URL", async () => {
    const { data, redirectedTo } = await runLoader("http://localhost/?sort=name&order=asc");

    expect(redirectedTo).toBeNull();
    expect(data).toMatchObject({ sort: "name", order: "asc" });
  });

  // An unknown value must be rewritten to the normalized URL, not passed
  // through to the API, which would answer 422.
  it("redirects an unknown sort to the normalized URL", async () => {
    const { redirectedTo } = await runLoader("http://localhost/?sort=cor");

    expect(redirectedTo).toBe("/");
  });

  it("keeps a valid status and drops an unknown one", async () => {
    const kept = await runLoader("http://localhost/?status=paid");
    expect(kept.redirectedTo).toBeNull();
    expect(kept.data).toMatchObject({ status: "paid" });

    const dropped = await runLoader("http://localhost/?status=quase");
    expect(dropped.redirectedTo).toBe("/");
  });
});
