import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { dailyCountsFixture } from "@/test/msw/handlers";
import { QueryWrapper } from "@/test/utils";
import { AuthContext } from "@/context/auth-context";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import PageCalendar from "./PageCalendar";

const USER = { id: 1, name: "Ana", email: "ana@example.com", role: "standard" as const };

// The loader is stubbed: what it does is covered by router-loaders.calendar.test.ts,
// and stubbing keeps these tests about the screen. August 2026 matches the fixture.
function renderCalendar(month = "2026-08", day?: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, "token");
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(USER));

  const router = createMemoryRouter(
    [{ path: "/calendar", loader: () => ({ month, day }), Component: PageCalendar }],
    { initialEntries: [`/calendar?month=${month}${day ? `&day=${day}` : ""}`] }
  );

  return {
    router,
    ...render(
      <QueryWrapper>
        <AuthContext.Provider
          value={{
            user: USER,
            isAuthenticated: true,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </QueryWrapper>
    ),
  };
}

beforeEach(() => {
  localStorage.clear();
  queryClient.clear();
});

describe("PageCalendar", () => {
  it("names the month in the card titles, not on the axis", async () => {
    renderCalendar();

    // "agosto de 2026" — the period is the same for all 31 ticks, so it belongs in
    // the title.
    const headings = await screen.findAllByRole("heading");
    expect(headings.some((h) => /agosto de 2026/.test(h.textContent ?? ""))).toBe(true);
  });

  it("shows the count on a day that has refunds", async () => {
    renderCalendar();

    // The 3rd carries 2 in the fixture. The accessible name is where the count is
    // stated in words — the visible badge is aria-hidden, because "2" alone says
    // nothing to a screen reader.
    expect(
      await screen.findByRole("button", { name: /Dia 3, 2 solicitações/ })
    ).toBeInTheDocument();
  });

  // No badge on empty days: in a calendar the absence of a mark already reads as
  // zero, and 29 zeros would be noise. 29 of the 31 days are empty in the fixture,
  // so this is exercised rather than assumed.
  it("puts no count on a day without refunds", async () => {
    renderCalendar();
    await screen.findByRole("button", { name: /Dia 3, 2 solicitações/ });

    // Exactly the two days that have data carry a count, out of the 31 in the month
    // plus the neighbouring days the grid shows. Counting is the sharp assertion
    // here: naming one empty day would be ambiguous, because react-day-picker
    // renders days from the adjacent months too, so "4" matches twice.
    const marked = screen
      .getAllByRole("button")
      .filter((button) => /solicitaç/.test(button.getAttribute("aria-label") ?? ""));

    expect(marked).toHaveLength(2);
  });

  it("writes the chosen day into the URL", async () => {
    const { router } = renderCalendar();
    const dayButton = await screen.findByRole("button", { name: /Dia 3, 2 solicitações/ });

    await userEvent.click(dayButton);

    await waitFor(() => expect(router.state.location.search).toContain("day=2026-08-03"));
  });

  // The fixture's refund was created on 2026-07-20, and the listing handler honours
  // the date filter — so a day panel for the 3rd of August must come back empty.
  // That is what proves the filter travelled to the request.
  it("lists nothing for a day with no refunds of its own", async () => {
    renderCalendar("2026-08", "2026-08-03");

    expect(await screen.findByText("Nenhuma solicitação neste dia.")).toBeInTheDocument();
  });

  it("shows no day panel until a day is chosen", async () => {
    renderCalendar();
    await screen.findByRole("button", { name: /Dia 3, 2 solicitações/ });

    expect(screen.queryByText(/Solicitações de /)).toBeNull();
  });

  it("names the scope the server returned", async () => {
    renderCalendar();

    expect(await screen.findByText("Suas solicitações")).toBeInTheDocument();
  });

  it("names the company scope when the server says all", async () => {
    server.use(
      http.get("*/refunds/daily-counts", () =>
        HttpResponse.json({ ...dailyCountsFixture, scope: "all" })
      )
    );
    renderCalendar();

    expect(await screen.findByText("Toda a empresa")).toBeInTheDocument();
  });

  // Silence would be indistinguishable from a month with nothing in it.
  it("announces a failure instead of an empty grid", async () => {
    server.use(
      http.get("*/refunds/daily-counts", () => new HttpResponse(null, { status: 500 }))
    );
    renderCalendar();

    const alerts = await screen.findAllByRole("alert");
    expect(alerts[0]).toHaveTextContent("Não foi possível carregar o calendário.");
  });
});
