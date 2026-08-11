import { describe, expect, it } from "vitest";
import { userListSearchParamsSchema, userSchema } from "./user";

const API_USER = {
  id: 1,
  name: "Ana",
  email: "ana@example.com",
  role: "standard",
  has_avatar: false,
  created_at: "2026-01-01T12:00:00",
};

describe("userSchema", () => {
  it("accepts the API's user shape", () => {
    expect(userSchema.parse(API_USER).name).toBe("Ana");
  });

  // The column is nullable, so a schema demanding a string would reject a real
  // response instead of the frontend rendering a dash.
  it("accepts a null created_at", () => {
    expect(userSchema.parse({ ...API_USER, created_at: null }).created_at).toBeNull();
  });

  // A third role must fail at the boundary rather than reach a component that
  // would index USER_ROLE with it and render undefined.
  it("rejects a role the column does not hold", () => {
    expect(() => userSchema.parse({ ...API_USER, role: "owner" })).toThrow();
  });

  // If the API ever regressed and sent the hash, the schema would let it
  // through as an unknown key — so this pins that the parsed OUTPUT is clean,
  // which is what components read.
  it("strips an unexpected password field from the parsed output", () => {
    const parsed = userSchema.parse({ ...API_USER, password: "$2b$12$hash" });
    expect(parsed).not.toHaveProperty("password");
  });
});

describe("userListSearchParamsSchema", () => {
  // A URL is user-editable: a mistyped parameter must fall back to the default
  // instead of putting the whole page into isError.
  it("falls back to page 1 for a non-numeric page", () => {
    expect(userListSearchParamsSchema.parse({ page: "abc" }).page).toBe(1);
  });

  it("falls back to page 1 for a zero or negative page", () => {
    expect(userListSearchParamsSchema.parse({ page: "0" }).page).toBe(1);
    expect(userListSearchParamsSchema.parse({ page: "-3" }).page).toBe(1);
  });

  it("coerces a numeric string", () => {
    expect(userListSearchParamsSchema.parse({ page: "4" }).page).toBe(4);
  });

  // Blank is not a search: it must become absent so the query key and the
  // request agree that no filter is applied.
  it("treats a blank name as absent", () => {
    expect(userListSearchParamsSchema.parse({ name: "   " }).name).toBeUndefined();
  });

  it("trims the name", () => {
    expect(userListSearchParamsSchema.parse({ name: " ana " }).name).toBe("ana");
  });
});
