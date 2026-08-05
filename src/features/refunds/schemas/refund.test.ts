import { describe, it, expect } from "vitest";
import { refundCreateSchema, refundListSearchParamsSchema, refundSchema } from "./refund";

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
      // The schema now carries a catalogue KEY, not display text: schemas are
      // evaluated at import time, before a locale exists. FormMessage resolves
      // it — PageRegister.test.tsx asserts the rendered Portuguese, which is
      // what proves the two halves connect.
      expect(result.error.issues[0].message).toBe("validation.nameRequired");
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
      expect(result.error.issues[0].message).toBe("validation.amountPositive");
    }
  });

  // A non-numeric string coerces to NaN and is rejected as an invalid number.
  it("rejects a non-numeric string", () => {
    expect(refundCreateSchema.shape.amount.safeParse("abc").success).toBe(false);
  });
});

const validRefund = {
  id: 1,
  name: "Almoço com cliente",
  category: "food",
  amount_in_cents: 4500,
  status: "pending",
  created_at: "2026-07-20T12:00:00.000Z",
  user: { id: 13, name: "Gabriel", has_avatar: false },
};

describe("refundSchema", () => {
  // The nested requester replaced the flat user_id: a payload in the new shape
  // must parse, keeping user.id reachable.
  it("accepts the nested user shape", () => {
    const result = refundSchema.safeParse(validRefund);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user.id).toBe(13);
    }
  });

  // The old flat shape must be rejected rather than silently accepted: this is
  // the assertion that would have caught the breaking change in CI.
  it("rejects the old flat shape", () => {
    const { user, ...withoutUser } = validRefund;
    void user;
    expect(refundSchema.safeParse({ ...withoutUser, user_id: 13 }).success).toBe(false);
  });

  // status is part of the contract now, and only the known values pass.
  it("rejects an unknown status", () => {
    expect(refundSchema.safeParse({ ...validRefund, status: "cancelled" }).success).toBe(false);
  });

  // The break this cycle exists to fix: the API started returning "paid" and the
  // enum did not have it, so every list containing a paid refund failed to parse
  // and the Home showed an error to every user.
  it("accepts a refund whose status is paid", () => {
    const parsed = refundSchema.parse({ ...validRefund, status: "paid" });
    expect(parsed.status).toBe("paid");
  });

  it("rejects a status the API never sends", () => {
    expect(() => refundSchema.parse({ ...validRefund, status: "archived" })).toThrow();
  });
});

describe("refundListSearchParamsSchema", () => {
  // An unknown sort must fall back to the default instead of reaching the API:
  // the server answers 422 for a sort outside its whitelist (UC-004), which
  // would turn a mistyped URL into the whole Home in isError.
  it("falls back to the default sort and order when the values are unknown", () => {
    const result = refundListSearchParamsSchema.parse({ sort: "cor", order: "cima" });

    expect(result.sort).toBe("created_at");
    expect(result.order).toBe("desc");
  });

  it("keeps a sort and order that belong to the server's whitelist", () => {
    const result = refundListSearchParamsSchema.parse({ sort: "amount_in_cents", order: "asc" });

    expect(result.sort).toBe("amount_in_cents");
    expect(result.order).toBe("asc");
  });

  // Absent status means "every status", not a status — so it must stay
  // undefined and be omitted from the request, not coerced to a value.
  it("leaves status undefined when absent and when unknown", () => {
    expect(refundListSearchParamsSchema.parse({}).status).toBeUndefined();
    expect(refundListSearchParamsSchema.parse({ status: "quase" }).status).toBeUndefined();
  });

  it("keeps a status that belongs to the server's whitelist", () => {
    expect(refundListSearchParamsSchema.parse({ status: "paid" }).status).toBe("paid");
  });
});
