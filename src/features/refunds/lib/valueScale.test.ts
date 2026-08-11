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

  it("switches to thousands once the axis gains resolution from it", () => {
    const scale = valueScaleFor([340_000 * REAIS]);

    expect(scale.unitLabelKey).toBe("chart.unitThousands");
    expect(scaleValue(340_000 * REAIS, scale)).toBe(340);
  });

  // The cut is at ten thousand, not one thousand: between the two, thousands would
  // produce 1, 2, 3 — resolution lost with no legibility gained.
  it("keeps reais between one and ten thousand", () => {
    expect(valueScaleFor([5_000 * REAIS]).unitLabelKey).toBe("chart.unitReais");
    expect(valueScaleFor([10_000 * REAIS]).unitLabelKey).toBe("chart.unitThousands");
  });

  it("switches to millions for very large amounts", () => {
    const scale = valueScaleFor([4_500_000 * REAIS]);

    expect(scale.unitLabelKey).toBe("chart.unitMillions");
    expect(scaleValue(4_500_000 * REAIS, scale)).toBe(5);
  });

  // The unit comes from the LARGEST value and applies to every point: two units on
  // one axis would make the bar heights incomparable.
  it("picks the unit from the largest value, not each value", () => {
    const scale = valueScaleFor([50_000 * REAIS, 100 * REAIS]);

    expect(scale.unitLabelKey).toBe("chart.unitThousands");
    // The small one rounds to zero on this axis, which is honest: it IS
    // negligible next to the largest. The tooltip carries the exact figure.
    expect(scaleValue(100 * REAIS, scale)).toBe(0);
  });

  it("survives an empty series", () => {
    expect(valueScaleFor([]).unitLabelKey).toBe("chart.unitReais");
  });

  // Integers only: the unit label above the chart carries the meaning, so a
  // fractional tick would add noise without adding information.
  it("always yields an integer", () => {
    const scale = valueScaleFor([1234 * REAIS]);

    expect(Number.isInteger(scaleValue(56789, scale))).toBe(true);
  });
});
