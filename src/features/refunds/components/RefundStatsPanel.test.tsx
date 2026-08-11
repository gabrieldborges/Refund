import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundFixture } from "@/test/msw/handlers";
import { QueryWrapper } from "@/test/utils";
import { REFUNDS_PER_PAGE } from "@/features/refunds";
import type { RefundViewer } from "../lib/getRefundHref";
import RefundStatsPanel from "./RefundStatsPanel";

const USER = { id: 2, name: "Bruno Lima" };
const adminViewer: RefundViewer = { id: 99, role: "admin" };

function listResponse() {
  const attributes = [10, 20].map((id, index) => ({
    ...refundFixture,
    id,
    name: `Solicitação ${index + 1}`,
    user: { id: USER.id, name: USER.name, has_avatar: false },
  }));
  return {
    type: "Refund",
    count: attributes.length,
    total: attributes.length,
    sum_amount_in_cents: attributes.reduce((sum, refund) => sum + refund.amount_in_cents, 0),
    page: 1,
    per_page: REFUNDS_PER_PAGE,
    total_pages: 1,
    attributes,
  };
}

function renderPanel(
  props: Partial<React.ComponentProps<typeof RefundStatsPanel>> = {}
) {
  server.use(http.get("*/refunds", () => HttpResponse.json(listResponse())));

  const router = createMemoryRouter(
    [
      {
        path: "/",
        Component: () => (
          <RefundStatsPanel
            userId={USER.id}
            userName={USER.name}
            viewer={adminViewer}
            {...props}
          />
        ),
      },
    ],
    { initialEntries: ["/"] }
  );

  return render(
    <QueryWrapper>
      <RouterProvider router={router} />
    </QueryWrapper>
  );
}

describe("RefundStatsPanel", () => {
  // The member page has no "current refund", so the highlight must be absent
  // rather than defaulting to the first row.
  it("marks no row as current when currentRefundId is omitted", async () => {
    const { container } = renderPanel();

    expect(await screen.findByText("Solicitação 1")).toBeInTheDocument();
    expect(container.querySelector('[aria-current="page"]')).toBeNull();
  });

  it("marks the matching row as current when currentRefundId is given", async () => {
    const { container } = renderPanel({ currentRefundId: 20 });

    expect(await screen.findByText("Solicitação 2")).toBeInTheDocument();
    const current = container.querySelector('[aria-current="page"]');
    expect(current).not.toBeNull();
    expect(current).toHaveTextContent("Solicitação 2");
  });

  // headerActions is a slot, not a boolean: an omitted slot renders nothing, and
  // the component never decides whether arrows exist.
  it("renders nothing extra when the header actions slot is empty", async () => {
    renderPanel();

    await screen.findByText("Solicitação 1");
    expect(screen.queryByTestId("panel-actions")).toBeNull();
  });

  it("renders whatever the header actions slot contains", async () => {
    renderPanel({ headerActions: <button data-testid="panel-actions">ação</button> });

    expect(await screen.findByTestId("panel-actions")).toBeInTheDocument();
  });

  // The panel owns no Card and no title: the caller wraps it. This is what keeps
  // the team member page from showing the person's name twice.
  it("does not render the person's name as a heading", async () => {
    renderPanel();

    await screen.findByText("Solicitação 1");
    expect(screen.queryByRole("heading", { name: USER.name })).toBeNull();
  });

  // The name is still needed for the link to the Home, which searches by name.
  it("links to the Home filtered by that person's name", async () => {
    renderPanel();

    await screen.findByText("Solicitação 1");
    const link = screen.getByRole("link", { name: /Bruno Lima/ });
    expect(link).toHaveAttribute("href", `/?name=${encodeURIComponent(USER.name)}`);
  });

  // Silence on error would be indistinguishable from a person with no refunds.
  it("announces a list error instead of rendering an empty list", async () => {
    server.use(http.get("*/refunds", () => new HttpResponse(null, { status: 500 })));

    const router = createMemoryRouter(
      [
        {
          path: "/",
          Component: () => (
            <RefundStatsPanel userId={USER.id} userName={USER.name} viewer={adminViewer} />
          ),
        },
      ],
      { initialEntries: ["/"] }
    );
    render(
      <QueryWrapper>
        <RouterProvider router={router} />
      </QueryWrapper>
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar as solicitações."
    );
  });
});
