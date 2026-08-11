import { beforeEach, describe, expect, it } from "vitest";
import type { LoaderFunctionArgs } from "react-router";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "./lib/api";
import { queryClient } from "./lib/query-client";
import { calendarLoader } from "./router-loaders";

function signIn(role: "admin" | "standard" = "standard") {
  localStorage.setItem(TOKEN_STORAGE_KEY, "token");
  localStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify({ id: 1, name: "Ana", email: "ana@example.com", role })
  );
}

function args(url: string) {
  return { request: new Request(url), params: {}, context: {} } as unknown as LoaderFunctionArgs;
}

async function thrown(promise: Promise<unknown>) {
  return promise.then(
    (value) => value,
    (caught) => caught
  );
}

const THIS_MONTH = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

beforeEach(() => {
  localStorage.clear();
  queryClient.clear();
});

describe("calendarLoader", () => {
  it("redirects an anonymous visitor to the login", async () => {
    const response = (await thrown(calendarLoader(args("http://localhost/calendar")))) as Response;

    expect(response.headers.get("location")).toBe("/login");
  });

  // The screen is for everyone; the server scopes the data by role. So unlike the
  // team loader, this one must NOT bounce a standard user.
  it("does not redirect a standard user", async () => {
    signIn("standard");

    const result = await thrown(calendarLoader(args(`http://localhost/calendar?month=${THIS_MONTH}`)));

    expect(result).not.toBeInstanceOf(Response);
    expect(result).toMatchObject({ month: THIS_MONTH });
  });

  // The month is resolved and WRITTEN to the URL, unlike the dashboard's year. The
  // Calendar component takes the month as a required prop, so the screen always has a
  // concrete one — and having it in the URL is what makes a reload land on the same
  // month.
  it("writes the current month into the URL when none was asked for", async () => {
    signIn();

    const response = (await thrown(calendarLoader(args("http://localhost/calendar")))) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`/calendar?month=${THIS_MONTH}`);
  });

  it("keeps a month that was asked for", async () => {
    signIn();

    await expect(
      calendarLoader(args("http://localhost/calendar?month=2026-03"))
    ).resolves.toMatchObject({ month: "2026-03" });
  });

  // A malformed month falls back to "none asked for" rather than into an error
  // state, and the loader then normalises it out of the URL.
  it("normalises a malformed month instead of failing", async () => {
    signIn();

    const response = (await thrown(
      calendarLoader(args("http://localhost/calendar?month=marco"))
    )) as Response;

    expect(response.headers.get("location")).toBe(`/calendar?month=${THIS_MONTH}`);
  });

  it("keeps a day that belongs to the month", async () => {
    signIn();

    await expect(
      calendarLoader(args("http://localhost/calendar?month=2026-03&day=2026-03-09"))
    ).resolves.toMatchObject({ month: "2026-03", day: "2026-03-09" });
  });

  // A day from another month does not belong to this view: it comes from a
  // hand-edited URL, or from a month changed without clearing the day.
  it("drops a day that belongs to another month", async () => {
    signIn();

    const response = (await thrown(
      calendarLoader(args("http://localhost/calendar?month=2026-03&day=2026-08-09"))
    )) as Response;

    expect(response.headers.get("location")).toBe("/calendar?month=2026-03");
  });

  it("drops a malformed day", async () => {
    signIn();

    const response = (await thrown(
      calendarLoader(args("http://localhost/calendar?month=2026-03&day=nove"))
    )) as Response;

    expect(response.headers.get("location")).toBe("/calendar?month=2026-03");
  });
});
