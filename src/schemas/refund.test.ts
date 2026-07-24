import { describe, it, expect } from "vitest";
import { refundCreateSchema } from "./refund";

// We validate each field through `refundCreateSchema.shape.*` instead of the
// whole object. This keeps the unit focused and avoids building a real
// `FileList` (the `file` field), which jsdom cannot construct cleanly. The
// file refinements are exercised later by the RefundFormDialog upload test.

describe("refundCreateSchema.shape.name", () => {
  // The name is required: an empty string must fail with the custom message.
  it("rejects an empty name", () => {
    const result = refundCreateSchema.shape.name.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nome é obrigatório");
    }
  });

  // A non-empty name is accepted.
  it("accepts a filled name", () => {
    expect(refundCreateSchema.shape.name.safeParse("Almoço com cliente").success).toBe(true);
  });
});

describe("refundCreateSchema.shape.category", () => {
  // A value outside CATEGORY_VALUES is rejected.
  it("rejects an unknown category", () => {
    expect(refundCreateSchema.shape.category.safeParse("comida").success).toBe(false);
  });

  // A known category value is accepted.
  it("accepts a valid category", () => {
    expect(refundCreateSchema.shape.category.safeParse("food").success).toBe(true);
  });
});

describe("refundCreateSchema.shape.amount", () => {
  // A numeric string is coerced into a number (this is what the form field
  // sends: an <input> value is always a string until Zod coerces it).
  it("coerces a numeric string into a number", () => {
    const result = refundCreateSchema.shape.amount.safeParse("12.5");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(12.5);
    }
  });

  // Zero or negative amounts fail with the custom "greater than zero" message.
  it("rejects a non-positive amount", () => {
    const result = refundCreateSchema.shape.amount.safeParse("-5");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Valor deve ser maior que zero");
    }
  });

  // A non-numeric string coerces to NaN and is rejected as an invalid number.
  it("rejects a non-numeric string", () => {
    expect(refundCreateSchema.shape.amount.safeParse("abc").success).toBe(false);
  });
});
