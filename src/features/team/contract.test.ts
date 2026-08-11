import { describe, expect, it } from "vitest";
import contract from "./contract/users.json";
import { userListResponseSchema, userResponseSchema } from "./schemas/user";

// The contract file is captured from the REAL API by
// Refund-api/src/test_integration/contract_test.py and copied here by hand (the
// two repositories are independent, so neither CI can do it). These tests assert
// our schemas match what the API actually answers, not what we assumed.
describe("the users contract", () => {
  it("matches userListResponseSchema", () => {
    expect(() => userListResponseSchema.parse(contract.userList)).not.toThrow();
  });

  it("matches userResponseSchema", () => {
    expect(() => userResponseSchema.parse(contract.userDetail)).not.toThrow();
  });

  // The whole point of the API's user_serializer. If the hash ever reaches a
  // response, this fails here instead of in a browser — and it checks the raw
  // JSON rather than the parsed output, because Zod would silently strip it.
  it("carries no password anywhere", () => {
    expect(JSON.stringify(contract)).not.toContain("password");
  });

  // The list must have more than one row, or a per-row shape error could hide in
  // a single-element array — the reason the capture uses two fixtures.
  it("captured more than one user", () => {
    expect(contract.userList.attributes.length).toBeGreaterThan(1);
  });

  // Ordered by name ascending, which the API fixes and no client can change.
  it("is ordered by name", () => {
    const names = contract.userList.attributes.map((user) => user.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});
