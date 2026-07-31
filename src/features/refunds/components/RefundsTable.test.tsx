import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { refundFixture } from "@/test/msw/handlers";
import type { RefundViewer } from "../lib/getRefundHref";
import type { Refund } from "../schemas/refund";
import RefundsTable from "./RefundsTable";

const adminViewer: RefundViewer = { id: 99, role: "admin" };

// Two refunds from DIFFERENT people: the requester column only earns its place
// when the rows are not all the same person, and a single-row fixture could
// not tell "the column renders" from "the column renders the wrong name".
const refunds: Refund[] = [
  {
    ...refundFixture,
    id: 1,
    name: "Almoço com cliente",
    created_at: "2026-07-20T12:00:00.000Z",
    user: { id: 1, name: "Ana Souza", has_avatar: false },
  } as Refund,
  {
    ...refundFixture,
    id: 2,
    name: "Passagem aérea",
    amount_in_cents: 120000,
    created_at: "2026-07-21T12:00:00.000Z",
    user: { id: 2, name: "Bruno Lima", has_avatar: false },
  } as Refund,
];

function renderTable(viewer: RefundViewer | null = adminViewer) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        Component: () => <RefundsTable refunds={refunds} viewer={viewer} isLoading={false} />,
      },
    ],
    { initialEntries: ["/"] }
  );

  return render(<RouterProvider router={router} />);
}

describe("RefundsTable", () => {
  it("renders one row per refund inside a table", () => {
    renderTable();

    expect(screen.getByRole("table")).toBeInTheDocument();
    // Header row + two data rows.
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("shows the requester name of each row", () => {
    renderTable();

    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("Bruno Lima")).toBeInTheDocument();
  });

  it("shows the creation date of each row, formatted", () => {
    renderTable();

    expect(screen.getByText("20/07/2026")).toBeInTheDocument();
    expect(screen.getByText("21/07/2026")).toBeInTheDocument();
  });

  it("shows the amount and the status of each row", () => {
    renderTable();

    expect(screen.getByText("R$ 45,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.200,00")).toBeInTheDocument();
    expect(screen.getAllByText("Pendente")).toHaveLength(2);
  });

  // The row's destination still follows the shared BR-016 rule. Asserting the
  // href (not just that a link exists) is what keeps the table honest against
  // the Home's existing row-navigation tests, which look the refund up by its
  // accessible name.
  it("links the title to the review route for an admin viewing someone else's refund", () => {
    renderTable(adminViewer);

    expect(screen.getByRole("link", { name: "Almoço com cliente" })).toHaveAttribute(
      "href",
      "/refunds/1/review"
    );
  });

  it("links the title to the plain detail route for a standard viewer", () => {
    renderTable({ id: 42, role: "standard" });

    expect(screen.getByRole("link", { name: "Almoço com cliente" })).toHaveAttribute(
      "href",
      "/refunds/1"
    );
  });

  // The category is an icon: without a text alternative the column would be
  // silent to a screen reader, which the old list layout avoided by printing
  // the label next to the title.
  it("gives the category icon a text alternative", () => {
    renderTable();

    expect(screen.getAllByText("Alimentação")).toHaveLength(2);
  });
});
