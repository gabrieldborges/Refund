import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundSummaryFixture } from "@/test/msw/handlers";
import { QueryWrapper } from "@/test/utils";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import PageDashboard from "./PageDashboard";
import { dashboardLoader } from "../router-loaders";

function signIn(role: "admin" | "standard" = "standard") {
  localStorage.setItem(TOKEN_STORAGE_KEY, "token");
  localStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify({ id: 1, name: "Ana", email: "ana@example.com", role })
  );
}

function renderPage(entry = "/dashboard", { stubLoader = false } = {}) {
  signIn();
  const router = createMemoryRouter(
    [
      {
        path: "/dashboard",
        loader: stubLoader ? () => ({ months: 6 }) : dashboardLoader,
        Component: PageDashboard,
      },
    ],
    { initialEntries: [entry] }
  );
  return {
    router,
    ...render(
      <QueryWrapper>
        <RouterProvider router={router} />
      </QueryWrapper>
    ),
  };
}

beforeEach(() => {
  localStorage.clear();
  queryClient.clear();
});

describe("PageDashboard", () => {
  it("shows the request count summed across every status", async () => {
    renderPage();

    // 2 + 3 + 1 + 4 from the fixture.
    expect(await screen.findByText("10")).toBeInTheDocument();
  });

  // The number the Home never had. Approved + paid, NOT the sum of all four:
  // summing the four would mix a forecast, a liability, a settled expense and
  // nothing. The fixture is built so the two arithmetics differ.
  it("shows approved plus paid, not the sum of all four statuses", async () => {
    renderPage();

    // approved 5000 + paid 1000 = 6000 cents.
    expect(await screen.findByText("R$ 60,00")).toBeInTheDocument();
    // The wrong arithmetic would be 3000+5000+1000+9000 = 18000.
    expect(screen.queryByText("R$ 180,00")).toBeNull();
  });

  it("shows the pending count", async () => {
    renderPage();
    await screen.findByText("10");

    expect(screen.getByText("Pendentes")).toBeInTheDocument();
  });

  // The same charts mean different things for an admin and a requester, so the
  // screen has to say which scope it is showing.
  it("names the scope the server returned", async () => {
    renderPage();

    expect(await screen.findByText("Suas solicitações")).toBeInTheDocument();
  });

  it("names the company scope when the server says all", async () => {
    server.use(
      http.get("*/refunds/summary", () =>
        HttpResponse.json({ ...refundSummaryFixture, scope: "all" })
      )
    );
    renderPage();

    expect(await screen.findByText("Toda a empresa")).toBeInTheDocument();
  });

  // The year lives in the card title, not on the axis: it is the same for all
  // twelve ticks, and on the axis it would spend the width mobile does not have.
  it("renders the four chart cards, each naming the year", async () => {
    renderPage();
    await screen.findByText("10");

    for (const title of [
      /Solicitações por status 2026/,
      /Valor por categoria 2026/,
      /Valor solicitado por mês 2026/,
      /Solicitações por status, mês a mês 2026/,
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  // The unit sits above the chart rather than repeated on every tick. With the
  // fixture's small values it must read "em reais", not "em milhares" — a fixed
  // thousands scale would show 0 for everything here.
  it("labels the value charts with the unit the data deserves", async () => {
    renderPage();
    await screen.findByText("10");

    expect(screen.getAllByText("em reais").length).toBeGreaterThan(0);
    expect(screen.queryByText("em milhares de reais")).toBeNull();
  });

  it("offers a year picker with the years that have data", async () => {
    renderPage();
    await screen.findByText("10");

    expect(screen.getByLabelText("Ano")).toBeInTheDocument();
  });

  // The picker must change the REQUEST, not only the URL — the handler echoes the
  // year back, so a stale request would show 2026 in the titles.
  it("reloads the summary for the chosen year", async () => {
    const { router } = renderPage("/dashboard?year=2025");

    expect(await screen.findByRole("heading", { name: /Solicitações por status 2025/ })).toBeInTheDocument();
    expect(router.state.location.search).toContain("year=2025");
  });

  // One year is not a choice: the picker hides rather than showing a single option.
  it("hides the picker when there is only one year", async () => {
    server.use(
      http.get("*/refunds/summary", () =>
        HttpResponse.json({ ...refundSummaryFixture, available_years: [2026] })
      )
    );
    renderPage();
    await screen.findByText("10");

    expect(screen.queryByLabelText("Ano")).toBeNull();
  });

  // Loader stubbed: dashboardLoader prefetches with ensureQueryData, which rejects
  // on a 500, so through the real loader the route throws into ContentError and
  // this component's own error branch is never reached. The branch under test is
  // the one a background refetch failure hits.
  it("announces a failure instead of rendering zeros", async () => {
    server.use(http.get("*/refunds/summary", () => new HttpResponse(null, { status: 500 })));
    renderPage("/dashboard", { stubLoader: true });

    const alerts = await screen.findAllByRole("alert");
    expect(alerts[0]).toHaveTextContent("Não foi possível carregar o resumo.");
    // A zeroed indicator would be indistinguishable from someone with nothing.
    expect(screen.queryByText("R$ 0,00")).toBeNull();
  });
});
