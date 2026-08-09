/**
 * The app-layer half of the contract with the real API.
 *
 * Login and the error envelope live here rather than beside the refunds
 * contract because their schemas are app-layer, and eslint-plugin-boundaries
 * (Item 9) forbids the refunds feature from importing them. The contract split
 * itself along the same seam the schemas already had.
 *
 * See src/features/refunds/contract.test.ts for the reasoning, the list of
 * divergences this exists to catch, and — importantly — what it does NOT
 * catch: the file is copied by hand between two independent repositories.
 */
import { describe, it, expect } from "vitest";
import { loginResponseSchema } from "@/schemas/auth";
import contract from "./contract/app.json";

describe("contract with the real API (app layer)", () => {
  it("login", () => {
    expect(() => loginResponseSchema.parse(contract.login)).not.toThrow();
  });

  // The login response still carries a raw avatar_filename, a known pendency.
  // Zod strips unknown keys so it parses fine — this asserts the field is
  // still THERE, so the day the backend drops it, the contract diff shows it
  // rather than it passing unnoticed.
  it("still carries the raw avatar_filename the pendency describes", () => {
    expect(contract.login).toHaveProperty("avatar_filename");
  });

  // getApiErrorMessage reads `detail` out of this on seven screens, so the
  // error envelope is as much a contract as any success payload.
  it("the error envelope carries a string detail and a request id", () => {
    expect(typeof contract.problemDocument.detail).toBe("string");
    expect(contract.problemDocument).toHaveProperty("request_id");
  });
});
