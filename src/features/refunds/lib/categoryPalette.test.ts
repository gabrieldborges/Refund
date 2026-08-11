import { describe, expect, it } from "vitest";
import { categoryColor } from "./categoryPalette";
import { CATEGORIES } from "../constants/categories";
import { PALETTE, NEGATIVE_COLOR } from "./chartPalette";
import type { RefundCategory } from "../constants/categories";

const CATEGORY_IDS = Object.keys(CATEGORIES) as RefundCategory[];

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

describe("categoryColor", () => {
  // Five categories, five DISTINCT colours. This is the whole reason the palette
  // exists: the status palette has four slots, and cycling would repeat the first
  // colour on the fifth category — two categories in one colour identify nothing.
  it("gives every category its own colour, in both themes", () => {
    for (const theme of ["light", "dark"] as const) {
      const colours = CATEGORY_IDS.map((category) => categoryColor(category, theme));

      expect(colours).toHaveLength(5);
      expect(new Set(colours).size).toBe(5);
    }
  });

  it("covers every category the domain has", () => {
    for (const category of CATEGORY_IDS) {
      expect(categoryColor(category, "light")).toMatch(/^#[0-9a-f]{6}$/i);
      expect(categoryColor(category, "dark")).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  // The themes differ: each set was validated against its own surface. Identical
  // lists would mean one of the two was never checked.
  it("uses different steps per theme", () => {
    const light = CATEGORY_IDS.map((c) => categoryColor(c, "light"));
    const dark = CATEGORY_IDS.map((c) => categoryColor(c, "dark"));

    expect(light).not.toEqual(dark);
  });

  // The category colours must not collide with the STATUS colours: both palettes live
  // on the dashboard, and a shared hex would make one colour mean two things.
  it("shares no colour with the status palette", () => {
    const status = new Set<string>([...PALETTE, NEGATIVE_COLOR]);

    for (const theme of ["light", "dark"] as const) {
      for (const category of CATEGORY_IDS) {
        expect(status.has(categoryColor(category, theme))).toBe(false);
      }
    }
  });

  // Categorical, not sequential: the colours must NOT form a lightness ramp, or the
  // chart would imply an order the categories do not have.
  it("is not a lightness ramp", () => {
    const lums = CATEGORY_IDS.map((c) => relativeLuminance(categoryColor(c, "light")));
    const ascending = lums.every((l, i) => i === 0 || l > lums[i - 1]);
    const descending = lums.every((l, i) => i === 0 || l < lums[i - 1]);

    expect(ascending || descending).toBe(false);
  });
});
