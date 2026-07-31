import { describe, it, expect } from "vitest";
import { canReviewRefund, getRefundHref, type RefundViewer } from "./getRefundHref";

const admin: RefundViewer = { id: 1, role: "admin" };
const standard: RefundViewer = { id: 1, role: "standard" };
const otherPersonsRefund = { user: { id: 2 } };
const ownRefund = { user: { id: 1 } };

describe("canReviewRefund", () => {
  // BR-016: an admin may review any refund except their own.
  it("allows an admin to review someone else's refund", () => {
    expect(canReviewRefund(otherPersonsRefund, admin)).toBe(true);
  });

  it("forbids an admin from reviewing their own refund", () => {
    expect(canReviewRefund(ownRefund, admin)).toBe(false);
  });

  it("forbids a standard user, regardless of whose refund it is", () => {
    expect(canReviewRefund(otherPersonsRefund, standard)).toBe(false);
  });

  it("forbids a null viewer (not yet authenticated)", () => {
    expect(canReviewRefund(otherPersonsRefund, null)).toBe(false);
  });
});

describe("getRefundHref", () => {
  it("routes to the review page when canReviewRefund is true", () => {
    const refund = { id: 5, ...otherPersonsRefund };
    expect(getRefundHref(refund, admin)).toBe("/refunds/5/review");
  });

  it("routes to the plain detail page when canReviewRefund is false", () => {
    const refund = { id: 5, ...ownRefund };
    expect(getRefundHref(refund, admin)).toBe("/refunds/5");
  });
});
