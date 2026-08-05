import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import RefundsTable from "./RefundsTable";
import type { Refund } from "../schemas/refund";

function refund(id: number, name: string): Refund {
  return {
    id,
    name,
    category: "food",
    amount_in_cents: 1234,
    created_at: "2026-03-09T00:00:00Z",
    status: "pending",
    user: { id: 1, name: "Ana Souza", role: "standard", has_avatar: false },
  } as Refund;
}

function renderTable(names: string[]) {
  return render(
    <MemoryRouter>
      <RefundsTable
        refunds={names.map((name, index) => refund(index + 1, name))}
        isLoading={false}
        viewer={{ id: 1, role: "admin" }}
        sort="created_at"
        order="desc"
        onSortChange={() => {}}
      />
    </MemoryRouter>
  );
}

// jsdom has no layout engine, so nothing here measures a rendered pixel. What
// it can prove is that the mechanism responsible for stable widths is actually
// wired up: table-fixed on the table, an explicit width on every column, and
// truncate on the text columns that can overflow.
//
// Without table-fixed the browser sizes each column from the content of the
// page being shown, so paginating to rows with longer names silently resizes
// every column — the symptom this guards against.
describe("RefundsTable column sizing", () => {
  it("lays the table out with fixed column widths", () => {
    renderTable(["Almoço"]);

    expect(screen.getByRole("table")).toHaveClass("table-fixed");
  });

  it("gives every column header an explicit width", () => {
    renderTable(["Almoço"]);

    for (const header of screen.getAllByRole("columnheader")) {
      const hasWidth = /(^|\s)(sm:)?w-/.test(header.className);
      expect(hasWidth, `sem largura: "${header.textContent}"`).toBe(true);
    }
  });

  // The two columns that hold free text are the ones a long value can blow
  // out; the rest are dates, amounts, a badge and an icon.
  it("truncates the text columns rather than letting them push the others", () => {
    renderTable(["Um nome de solicitação deliberadamente muito longo para caber"]);

    const [, titleHeader, requesterHeader] = screen.getAllByRole("columnheader");
    expect(titleHeader).toHaveClass("truncate");
    expect(requesterHeader).toHaveClass("truncate");
  });

  // The header row is what table-fixed measures, so widths declared only on the
  // body cells would not constrain anything. This asserts both carry them.
  it("declares the same widths on body cells, not only on headers", () => {
    renderTable(["Almoço"]);

    const cells = screen.getAllByRole("cell");
    const withWidth = cells.filter((cell) => /(^|\s)(sm:)?w-/.test(cell.className));
    expect(withWidth.length).toBe(cells.length);
  });
});
