import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth } from "./useAuth";

describe("useAuth", () => {
  // FOUND BY COVERAGE (Item 26). Line 7 — the guard — had never executed in
  // 304 tests. Every test that uses auth renders inside an AuthProvider, so
  // the failure path was invisible: the hook returning undefined instead of
  // throwing would surface as "cannot read property of undefined" somewhere
  // far from the actual mistake.
  it("throws a named error when used outside an AuthProvider", () => {
    // The error is expected, so React's console noise is silenced rather than
    // left to look like a real failure in the output.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider"
    );

    consoleError.mockRestore();
  });
});
