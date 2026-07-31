import { describe, it, expect } from "vitest";
import { formatCentsToBRL, formatDate } from "./format";

// Compare against the same Intl formatter the function uses, so the assertion
// does not hardcode a specific separator/space (pt-BR uses a non-breaking
// space between "R$" and the number, which is easy to get wrong by hand).
function expectedBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

describe("formatCentsToBRL", () => {
  // Basic case: cents are divided by 100 and rendered as BRL currency.
  it("formats cents into a BRL string", () => {
    expect(formatCentsToBRL(1050)).toBe(expectedBRL(10.5));
  });

  // Zero must still render with two decimals, not an empty or "R$ 0" string.
  it("formats zero cents with two decimals", () => {
    expect(formatCentsToBRL(0)).toBe(expectedBRL(0));
  });

  // Large amounts must include the thousands separator.
  it("formats large amounts with a thousands separator", () => {
    // 123456789 cents = R$ 1.234.567,89
    expect(formatCentsToBRL(123456789)).toBe(expectedBRL(1234567.89));
  });

  // A single leftover cent must round-trip through the division correctly.
  it("keeps a single cent visible", () => {
    expect(formatCentsToBRL(1)).toBe(expectedBRL(0.01));
  });
});

describe("formatDate", () => {
  it("formats an ISO timestamp as a pt-BR date", () => {
    expect(formatDate("2026-07-20T12:00:00.000Z")).toBe("20/07/2026");
  });

  // created_at is nullable in the API contract (refund.ts), so the formatter
  // must answer with a placeholder instead of throwing or printing
  // "Invalid Date" into a table cell.
  it("returns a dash for a null date", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("returns a dash for a string that is not a date", () => {
    expect(formatDate("não é data")).toBe("—");
  });
});
