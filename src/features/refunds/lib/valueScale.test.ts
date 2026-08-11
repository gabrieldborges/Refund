import { describe, expect, it } from "vitest";
import { scaleValue, valueScaleFor } from "./valueScale";

const REAIS = 100;

describe("valueScaleFor", () => {
  // The whole reason the unit adapts. A fixed thousands scale works with big
  // numbers and lies with small ones: at R$ 1.878 the axis would read 2, and every
  // category below R$ 500 would read 0 — indistinguishable from a category with no
  // refunds at all.
  it("stays in reais for small amounts", () => {
    const scale = valueScaleFor([1878 * REAIS, 310 * REAIS]);

    expect(scale.unitLabelKey).toBe("chart.unitReais");
    expect(scaleValue(1878 * REAIS, scale)).toBe(1878);
    expect(scaleValue(310 * REAIS, scale)).toBe(310);
  });

  // THE regression this pins. scaleValue used to round, and rounding the GEOMETRY is
  // what made a R$ 300 category sit at exactly 0 beside a R$ 15.000 one — while 0
  // already means "this category has no refunds at all". A thin bar is not an absent
  // bar, and the chart was asserting it was.
  //
  // Rounding belongs to the axis tick FORMATTER, not to the value the bar is drawn
  // from. The exact figure stays in the tooltip.
  it("never turns a nonzero amount into zero", () => {
    const scale = valueScaleFor([15_000 * REAIS, 300 * REAIS, 45 * REAIS]);

    expect(scale.unitLabelKey).toBe("chart.unitThousands");
    for (const reais of [300, 90, 45, 1]) {
      expect(scaleValue(reais * REAIS, scale)).toBeGreaterThan(0);
    }
  });

  it("keeps the fraction instead of collapsing it", () => {
    const scale = valueScaleFor([15_000 * REAIS]);

    expect(scaleValue(300 * REAIS, scale)).toBeCloseTo(0.3, 5);
    expect(scaleValue(15_000 * REAIS, scale)).toBe(15);
  });

  // Ordering has to survive the scaling: a bigger amount is always a bigger value.
  it("preserves the ordering of the amounts", () => {
    const cents = [15_000, 300, 90, 45, 1].map((r) => r * REAIS);
    const scale = valueScaleFor(cents);
    const scaled = cents.map((c) => scaleValue(c, scale));

    for (let i = 1; i < scaled.length; i += 1) {
      expect(scaled[i]).toBeLessThan(scaled[i - 1]);
    }
  });

  it("switches to thousands once the axis gains resolution from it", () => {
    const scale = valueScaleFor([340_000 * REAIS]);

    expect(scale.unitLabelKey).toBe("chart.unitThousands");
    expect(scaleValue(340_000 * REAIS, scale)).toBe(340);
  });

  it("switches to millions for very large amounts", () => {
    const scale = valueScaleFor([4_500_000 * REAIS]);

    expect(scale.unitLabelKey).toBe("chart.unitMillions");
    expect(scaleValue(4_500_000 * REAIS, scale)).toBe(4.5);
  });

  // The cut is at ten thousand, not one thousand: between the two, thousands would
  // produce 1, 2, 3 — resolution lost with no legibility gained.
  it("keeps reais between one and ten thousand", () => {
    expect(valueScaleFor([5_000 * REAIS]).unitLabelKey).toBe("chart.unitReais");
    expect(valueScaleFor([10_000 * REAIS]).unitLabelKey).toBe("chart.unitThousands");
  });

  // The unit comes from the LARGEST value and applies to every point: two units on
  // one axis would make the bar heights incomparable.
  it("picks the unit from the largest value, not each value", () => {
    const scale = valueScaleFor([50_000 * REAIS, 100 * REAIS]);

    expect(scale.unitLabelKey).toBe("chart.unitThousands");
    // Small next to the largest, but NOT zero — it draws as a thin bar rather than
    // as an absent one.
    expect(scaleValue(100 * REAIS, scale)).toBeCloseTo(0.1, 5);
  });

  it("survives an empty series", () => {
    expect(valueScaleFor([]).unitLabelKey).toBe("chart.unitReais");
  });

  // Integers belong to the TICK LABEL, not to this function. Pinned so nobody
  // reintroduces the rounding here: that is what erased small categories.
  it("does not round", () => {
    const scale = valueScaleFor([1234 * REAIS]);

    expect(Number.isInteger(scaleValue(56789, scale))).toBe(false);
  });
});
