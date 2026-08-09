/**
 * Validates this app's Zod schemas against the API's REAL responses.
 *
 * Every other test here runs against MSW — handlers we wrote ourselves — so
 * the suite can be entirely green while the schemas disagree with the actual
 * backend. That is not hypothetical; it has happened four times:
 *
 *   - refundStatusSchema knew three statuses while the API answered a fourth
 *     ("paid"). The first paid refund would have put every user's Home into
 *     isError.
 *   - user_id moved from the top level into a nested `user` object.
 *   - the list fixture answers page 1 to a request for page 2.
 *   - the reviews fixture was not chronological while mocking a contract that
 *     says it is.
 *
 * api-responses.json is produced by the backend's integration suite
 * (Refund-api, src/test_integration/contract_test.py) by driving the real API
 * against a real PostgreSQL, and its volatile values — ids, timestamps,
 * tokens — are replaced with fixed ones OF THE SAME TYPE, so the file is
 * stable without lying about its shape.
 *
 * WHAT THIS DOES NOT CATCH, stated so nobody trusts it further than it
 * deserves: the file is COPIED BY HAND between two independent repositories.
 * The backend's CI fails if the API changed and the file was not regenerated;
 * this test fails if our schemas disagree with the file. Neither notices a
 * regenerated file that was never copied over. That gap is the price of two
 * repos — the same shape as the stale-SHA problem the project's state document
 * has recorded six times.
 *
 * This file lives INSIDE the feature, importing ./schemas/refund directly,
 * because the response schemas are deliberately not re-exported by the façade
 * (Item 8). A test that reached them from outside would either need that
 * encapsulation loosened or an eslint-disable — and the schemas being the
 * feature's own is precisely why the test belongs here.
 *
 * The JSON sits inside the feature for the same reason, and that placement was
 * decided BY THE LINTER, not by taste: src/test is classified as the `app`
 * layer, and eslint-plugin-boundaries (Item 9) forbids a feature importing
 * from app. Worth knowing when the backend copies the file over — the
 * destination is src/features/refunds/contract/, not somewhere more obvious.
 *
 * Login and the error envelope are NOT here for the same reason — their
 * schemas live in the app layer, which a feature may not import. They are
 * covered by src/test/contract.test.ts. The contract ended up split exactly
 * the way the schemas already were, which is a decent sign the rule is
 * describing something real.
 */
import { describe, it, expect } from "vitest";
import {
  fileUrlResponseSchema,
  refundResponseSchema,
  refundReviewsResponseSchema,
  refundStatsResponseSchema,
  refundsListResponseSchema,
} from "./schemas/refund";
import contract from "./contract/refunds.json";

describe("contract with the real API", () => {
  // Creation and detail share one schema since the backend started re-reading
  // the written row. Both are asserted because "they are identical" is exactly
  // the kind of claim that quietly stops being true.
  it("refund creation", () => {
    expect(() => refundResponseSchema.parse(contract.refundCreate)).not.toThrow();
  });

  it("refund detail", () => {
    expect(() => refundResponseSchema.parse(contract.refundDetail)).not.toThrow();
  });

  it("refund list", () => {
    expect(() => refundsListResponseSchema.parse(contract.refundList)).not.toThrow();
  });

  it("signed file url", () => {
    expect(() => fileUrlResponseSchema.parse(contract.receiptUrl)).not.toThrow();
  });

  it("refund reviews", () => {
    expect(() => refundReviewsResponseSchema.parse(contract.refundReviews)).not.toThrow();
  });

  it("refund stats", () => {
    expect(() => refundStatsResponseSchema.parse(contract.refundStats)).not.toThrow();
  });

  // The four statuses the API can answer must all be known here. This is the
  // exact divergence that would have broken the Home for every user, asserted
  // against the backend's own enum rather than against our memory of it.
  it("knows every status the API can return", () => {
    const statuses = ["pending", "approved", "paid", "rejected"];
    for (const status of statuses) {
      const withStatus = {
        ...contract.refundDetail,
        attributes: { ...contract.refundDetail.attributes, status },
      };
      expect(() => refundResponseSchema.parse(withStatus)).not.toThrow();
    }
  });
});
