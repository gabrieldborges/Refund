import { beforeEach, describe, expect, it } from "vitest";
import type { LoaderFunctionArgs } from "react-router";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "./lib/api";
import { queryClient } from "./lib/query-client";
import { teamLoader, teamMemberLoader } from "./router-loaders";

function signIn(role: "admin" | "standard") {
  localStorage.setItem(TOKEN_STORAGE_KEY, "token");
  localStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify({ id: 1, name: "Ana", email: "ana@example.com", role })
  );
}

function args(url: string, params: Record<string, string> = {}) {
  return { request: new Request(url), params, context: {} } as unknown as LoaderFunctionArgs;
}

// The loaders throw a redirect Response instead of returning, so every
// assertion below has to catch it rather than await a value.
async function thrown(promise: Promise<unknown>) {
  return promise.then(
    (value) => value,
    (caught) => caught
  );
}

beforeEach(() => {
  localStorage.clear();
  // The query client is a module-level singleton so loaders can prefetch, which
  // means one test's cached page would satisfy the next one's ensureQueryData.
  queryClient.clear();
});

describe("teamLoader", () => {
  it("redirects an anonymous visitor to the login", async () => {
    const response = (await thrown(teamLoader(args("http://localhost/team")))) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
  });

  // A UI guard, not a security one: the API refuses with 403/404 regardless
  // (BR-025). This only avoids offering a page that would be refused.
  it("redirects a standard user to the home", async () => {
    signIn("standard");

    const response = (await thrown(teamLoader(args("http://localhost/team")))) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
  });

  it("strips a page parameter that equals the default", async () => {
    signIn("admin");

    const response = (await thrown(teamLoader(args("http://localhost/team?page=1")))) as Response;

    expect(response.headers.get("location")).toBe("/team");
  });

  it("keeps a page parameter that carries information", async () => {
    signIn("admin");

    await expect(teamLoader(args("http://localhost/team?page=2"))).resolves.toMatchObject({
      page: 2,
    });
  });

  it("returns the normalized params for an admin", async () => {
    signIn("admin");

    await expect(teamLoader(args("http://localhost/team?name=ana"))).resolves.toMatchObject({
      page: 1,
      name: "ana",
    });
  });

  // The schema's .catch() is what keeps a mistyped URL from turning the page
  // into an error state; the loader then normalizes it out of the URL.
  it("normalizes an invalid page instead of failing", async () => {
    signIn("admin");

    const response = (await thrown(teamLoader(args("http://localhost/team?page=abc")))) as Response;

    expect(response.headers.get("location")).toBe("/team");
  });
});

describe("teamMemberLoader", () => {
  it("redirects a standard user to the home", async () => {
    signIn("standard");

    const response = (await thrown(
      teamMemberLoader(args("http://localhost/team/7", { id: "7" }))
    )) as Response;

    expect(response.headers.get("location")).toBe("/");
  });

  it("returns the id for an admin", async () => {
    signIn("admin");

    await expect(
      teamMemberLoader(args("http://localhost/team/1", { id: "1" }))
    ).resolves.toEqual({ id: "1" });
  });

  it("refuses a route with no id", async () => {
    signIn("admin");

    const response = (await thrown(
      teamMemberLoader(args("http://localhost/team/", {}))
    )) as Response;

    expect(response.status).toBe(400);
  });
});
