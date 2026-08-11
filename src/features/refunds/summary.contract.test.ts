import { describe, expect, it } from "vitest";
import contract from "./contract/refunds.json";
import {
  refundSummaryResponseSchema,
  refundSummarySearchParamsSchema,
} from "./schemas/summary";

// Captured from the REAL API by Refund-api/src/test_integration/contract_test.py
// and copied here by hand — the repositories are independent, so neither CI can do
// it. Both scopes are captured because they are different shapes to validate.
describe("the refund summary contract", () => {
  it("matches the schema in the user scope", () => {
    expect(() => refundSummaryResponseSchema.parse(contract.refundSummary)).not.toThrow();
  });

  it("matches the schema in the admin scope", () => {
    expect(() =>
      refundSummaryResponseSchema.parse(contract.refundSummaryAsAdmin)
    ).not.toThrow();
  });

  // scope is the only field telling the client whether it is reading the company
  // or one person, so the two captures must actually differ in it — otherwise the
  // contract would be validating the same shape twice.
  it("distinguishes the two scopes", () => {
    expect(contract.refundSummary.scope).toBe("user");
    expect(contract.refundSummaryAsAdmin.scope).toBe("all");
  });

  // The whole point of filling zeros on the server: a chart cannot tell an absent
  // key from a zero, because the absent bar simply disappears.
  it("carries all four statuses and all five categories", () => {
    expect(Object.keys(contract.refundSummary.by_status).sort()).toEqual([
      "approved",
      "paid",
      "pending",
      "rejected",
    ]);
    expect(Object.keys(contract.refundSummary.by_category).sort()).toEqual([
      "food",
      "lodging",
      "others",
      "service",
      "transport",
    ]);
  });

  // Twelve months, January to December, so the line chart has no gap to lie with
  // and the axis can carry bare month names under a year in the card title.
  it("carries twelve months, january to december", () => {
    const months = contract.refundSummary.by_month.map((month) => month.month.split("-")[1]);
    expect(months).toEqual([
      "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12",
    ]);
  });

  it("names the year and the years that have data", () => {
    expect(typeof contract.refundSummary.year).toBe("number");
    expect(Array.isArray(contract.refundSummary.available_years)).toBe(true);
  });

  it("gives every month a full status breakdown", () => {
    for (const month of contract.refundSummary.by_month) {
      expect(Object.keys(month.by_status).sort()).toEqual([
        "approved",
        "paid",
        "pending",
        "rejected",
      ]);
    }
  });
});

describe("refundSummarySearchParamsSchema", () => {
  // The year comes from the URL, which a person can edit. An invalid value falls
  // back to "no year asked for" rather than to a literal year: a literal would age
  // inside the code, and the server already knows what today is.
  it("falls back to undefined for anything invalid", () => {
    expect(refundSummarySearchParamsSchema.parse({ year: "abc" }).year).toBeUndefined();
    expect(refundSummarySearchParamsSchema.parse({ year: "1999" }).year).toBeUndefined();
    expect(refundSummarySearchParamsSchema.parse({ year: "2101" }).year).toBeUndefined();
    expect(refundSummarySearchParamsSchema.parse({}).year).toBeUndefined();
  });

  it("accepts a year inside the range", () => {
    expect(refundSummarySearchParamsSchema.parse({ year: "2025" }).year).toBe(2025);
  });
});
