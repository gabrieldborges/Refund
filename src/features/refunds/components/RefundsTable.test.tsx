import type React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function renderTable(
  viewer: RefundViewer | null = adminViewer,
  overrides: Partial<React.ComponentProps<typeof RefundsTable>> = {}
) {
  const props = {
    refunds,
    viewer,
    isLoading: false,
    sort: "created_at" as const,
    order: "desc" as const,
    onSortChange: () => {},
    ...overrides,
  };

  const router = createMemoryRouter([{ path: "/", Component: () => <RefundsTable {...props} /> }], {
    initialEntries: ["/"],
  });

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

describe("RefundsTable column visibility", () => {
  // For a standard user every row is their own, so a requester column would
  // repeat the same name down the page. The column is dropped, not blanked —
  // an empty column still costs a header and horizontal space.
  it("hides the requester column for a standard viewer", () => {
    renderTable({ id: 1, role: "standard" });

    expect(screen.queryByText("Solicitante")).not.toBeInTheDocument();
    expect(screen.queryByText("Bruno Lima")).not.toBeInTheDocument();
  });

  it("shows the requester column for an admin viewer", () => {
    renderTable(adminViewer);

    expect(screen.getByText("Solicitante")).toBeInTheDocument();
  });

  // Narrow screens drop category, requester and date via CSS so the table
  // degrades to the title/status/amount row the Home had before. Asserting the
  // class is the only option here: jsdom has no layout engine, so a real
  // media query cannot be evaluated in a unit test.
  it("marks the columns that collapse on narrow screens", () => {
    renderTable(adminViewer);

    expect(screen.getByText("Data").closest("th")).toHaveClass("hidden");
    expect(screen.getByText("Solicitante").closest("th")).toHaveClass("hidden");
  });
});

describe("RefundsTable sorting", () => {
  // Only the four columns the API accepts in `sort` (UC-004) may look
  // clickable. A button on category or requester would either do nothing or,
  // worse, invite a client-side sort over the 10 rows of the current page.
  it("offers a sort button only for the columns the API can sort", () => {
    renderTable(adminViewer);

    expect(screen.getByRole("button", { name: /Título/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Data/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Status/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Valor/ })).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /Solicitante/ })).not.toBeInTheDocument();
  });

  it("reports the clicked column to the caller", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    renderTable(adminViewer, { onSortChange });

    await user.click(screen.getByRole("button", { name: /Valor/ }));

    expect(onSortChange).toHaveBeenCalledWith("amount_in_cents");
  });

  // The sorted column must be announced, not just drawn with an arrow: a
  // screen reader user otherwise has no way to know which column is active.
  it("marks the active column with aria-sort", () => {
    renderTable(adminViewer, { sort: "amount_in_cents", order: "asc" });

    expect(screen.getByText("Valor").closest("th")).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getByText("Data").closest("th")).toHaveAttribute("aria-sort", "none");
  });
});
