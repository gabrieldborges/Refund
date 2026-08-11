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

  // Every month of the window, so the line chart has no gap to lie with.
  it("carries one entry per month of the window", () => {
    expect(contract.refundSummary.by_month).toHaveLength(contract.refundSummary.months);
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
  // The window comes from the URL, which a person can edit: an invalid value falls
  // back to the default instead of putting the whole screen into isError.
  it("falls back to six months for anything invalid", () => {
    expect(refundSummarySearchParamsSchema.parse({ months: "abc" }).months).toBe(6);
    expect(refundSummarySearchParamsSchema.parse({ months: "0" }).months).toBe(6);
    expect(refundSummarySearchParamsSchema.parse({ months: "13" }).months).toBe(6);
    expect(refundSummarySearchParamsSchema.parse({}).months).toBe(6);
  });

  it("accepts a value inside the range", () => {
    expect(refundSummarySearchParamsSchema.parse({ months: "12" }).months).toBe(12);
  });
});
