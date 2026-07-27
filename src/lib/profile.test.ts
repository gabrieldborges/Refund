import { describe, it, expect } from "vitest";
import { initialsFromName, usernameFromEmail } from "./profile";

describe("initialsFromName", () => {
  // Two-word name uses first letter of first and last word.
  it("takes first and last initials", () => {
    expect(initialsFromName("Gabriel Dantas")).toBe("GD");
  });
  // Single-word name falls back to its first two letters.
  it("handles a single word", () => {
    expect(initialsFromName("Gabriel")).toBe("GA");
  });
  // Extra spaces do not produce empty initials.
  it("ignores surrounding whitespace", () => {
    expect(initialsFromName("  Ana  Lima  ")).toBe("AL");
  });
});

describe("usernameFromEmail", () => {
  // Local part before @ becomes the username handle.
  it("derives the handle from the local part", () => {
    expect(usernameFromEmail("gabriel@example.com")).toBe("@gabriel");
  });
  // Dots in the local part are preserved.
  it("keeps dots", () => {
    expect(usernameFromEmail("ana.lima@x.com")).toBe("@ana.lima");
  });
});
