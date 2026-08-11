import { describe, expect, it } from "vitest";
import { monthLabel, visibleMonthTicks, yearOf } from "./monthLabel";

describe("monthLabel", () => {
  // Only the month: the year lives in the card title, because it is the same for
  // all twelve ticks and on the axis it would spend the width mobile lacks.
  it("renders the month alone, in the active locale", () => {
    expect(monthLabel("2026-01", "pt-BR").toLowerCase()).toContain("jan");
    expect(monthLabel("2026-03", "en-US").toLowerCase()).toContain("mar");
  });

  it("carries no year", () => {
    expect(monthLabel("2026-07", "pt-BR")).not.toContain("2026");
  });

  // Built on day 1 at noon: day 1 keeps a west-of-UTC timezone from rolling the
  // month back, and noon leaves twelve hours of slack for any offset.
  it("does not slide to the previous month", () => {
    for (let month = 1; month <= 12; month += 1) {
      const key = `2026-${String(month).padStart(2, "0")}`;
      const expected = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(
        new Date(2000, month - 1, 15)
      );
      expect(monthLabel(key, "pt-BR")).toBe(expected);
    }
  });
});

describe("yearOf", () => {
  it("extracts the year for the card title", () => {
    expect(yearOf("2026-08")).toBe("2026");
  });
});

describe("visibleMonthTicks", () => {
  const MONTHS = Array.from({ length: 12 }, (_, index) => `m${index + 1}`);

  it("labels every month on desktop", () => {
    expect(visibleMonthTicks(MONTHS, false)).toHaveLength(12);
  });

  // Twelve labels do not fit 390px: they collide, or nivo clips them, and a
  // clipped axis is worse than a sparser one. The SERIES keeps all twelve points —
  // only the labelling thins out.
  it("labels every other month on mobile", () => {
    const ticks = visibleMonthTicks(MONTHS, true);

    expect(ticks).toEqual(["m1", "m3", "m5", "m7", "m9", "m11"]);
  });

  it("does not mutate the input", () => {
    const input = [...MONTHS];
    visibleMonthTicks(input, false);
    expect(input).toEqual(MONTHS);
  });
});
