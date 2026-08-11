import { describe, expect, it } from "vitest";
import {
  HEAT_STEPS,
  heatMax,
  heatStepBounds,
  heatStepIndex,
  heatSteps,
} from "./heatScale";

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string): number {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

describe("heatStepIndex", () => {
  // Zero gets no step at all: in a calendar the absence of a mark already reads as
  // zero, and painting 31 cells of "nothing" would spend the scale on the least
  // interesting information on screen.
  it("gives zero no step", () => {
    expect(heatStepIndex(0, 10)).toBeNull();
  });

  it("gives a negative count no step", () => {
    expect(heatStepIndex(-1, 10)).toBeNull();
  });

  // A month with nothing has no scale to place anything on.
  it("gives no step when the month is empty", () => {
    expect(heatStepIndex(3, 0)).toBeNull();
  });

  // The busiest day reaches the top step — but only once the month HAS a busy day.
  // The floor below is why: the top step means "busy", and a month of two requests
  // has none.
  it("puts the month's maximum on the last step once there is volume", () => {
    for (const max of [HEAT_STEPS, 7, 10, 47, 200]) {
      expect(heatStepIndex(max, max)).toBe(HEAT_STEPS - 1);
    }
  });

  // The floor, which a failing test found. Without it a month with ONE request put
  // that day on the darkest step — an alarming red for a single request, just
  // because it was technically the month's maximum.
  it("does not stretch a tiny month across the whole ramp", () => {
    expect(heatStepIndex(1, 1)).toBe(0);
    expect(heatStepIndex(2, 2)).toBe(1);
    expect(heatStepIndex(3, 3)).toBe(2);
  });

  // And one must always land on the first step, whatever the maximum: it is the
  // smallest thing that is not nothing.
  it("puts a single request on the first step", () => {
    for (const max of [1, 5, 200]) {
      expect(heatStepIndex(1, max)).toBe(0);
    }
  });

  it("never returns an index outside the ramp", () => {
    for (const max of [1, 3, 10, 200]) {
      for (let count = 1; count <= max; count += 1) {
        const index = heatStepIndex(count, max);
        expect(index).not.toBeNull();
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(HEAT_STEPS);
      }
    }
  });

  // Monotonic in the data: more requests never means a cooler step.
  it("never goes down as the count goes up", () => {
    const max = 200;
    let previous = -1;
    for (let count = 1; count <= max; count += 1) {
      const index = heatStepIndex(count, max) ?? -1;
      expect(index).toBeGreaterThanOrEqual(previous);
      previous = index;
    }
  });

  // The whole reason the domain adapts. With a fixed 0-200 scale and this project's
  // real volumes, every day would sit on the palest step forever.
  it("uses the whole ramp even at small volumes", () => {
    const counts = [1, 2, 3, 4, 5];
    const max = heatMax(counts);
    const used = new Set(counts.map((count) => heatStepIndex(count, max)));

    expect(used.size).toBe(HEAT_STEPS);
  });
});

describe("heatMax", () => {
  it("is the largest count", () => {
    expect(heatMax([0, 3, 1, 7, 2])).toBe(7);
  });

  it("is zero for an empty month", () => {
    expect(heatMax([])).toBe(0);
    expect(heatMax([0, 0, 0])).toBe(0);
  });
});

describe("heatStepBounds", () => {
  // The legend is mandatory for this visualisation, because the scale adapts: the
  // same colour means different counts in different months. These are the numbers it
  // prints.
  it("ends at the month's maximum", () => {
    expect(heatStepBounds(200).at(-1)).toBe(200);
  });

  // The legend uses the SAME floor as the grid. Without it, a two-request month
  // would advertise "up to 2" on the last step while no cell ever reached it.
  it("respects the same floor the grid uses", () => {
    expect(heatStepBounds(1).at(-1)).toBe(HEAT_STEPS);
  });

  it("never labels a step with zero", () => {
    for (const bound of heatStepBounds(2)) {
      expect(bound).toBeGreaterThanOrEqual(1);
    }
  });

  it("rises across the steps", () => {
    const bounds = heatStepBounds(200);
    for (let index = 1; index < bounds.length; index += 1) {
      expect(bounds[index]).toBeGreaterThan(bounds[index - 1]);
    }
  });
});

describe("the ramps", () => {
  // A count is a magnitude, so the scale must be orderable by lightness alone —
  // that is the pre-attentive channel. A cool-to-warm ramp was measured and is NOT
  // monotonic (its middle yellow is lighter than the green before it), which is why
  // this is a single hue.
  it("is monotonic in lightness on light, getting darker", () => {
    const lums = heatSteps("light").map((step) => relativeLuminance(step.background));
    for (let index = 1; index < lums.length; index += 1) {
      expect(lums[index]).toBeLessThan(lums[index - 1]);
    }
  });

  // Dark gets its OWN steps, rising: reusing the light ramp would make the palest
  // step — one request — the most prominent cell on a dark card.
  it("is monotonic in lightness on dark, getting brighter", () => {
    const lums = heatSteps("dark").map((step) => relativeLuminance(step.background));
    for (let index = 1; index < lums.length; index += 1) {
      expect(lums[index]).toBeGreaterThan(lums[index - 1]);
    }
  });

  it("has the same number of steps in both themes", () => {
    expect(heatSteps("light")).toHaveLength(HEAT_STEPS);
    expect(heatSteps("dark")).toHaveLength(HEAT_STEPS);
  });

  // The day number sits ON the colour, so every pair has to clear AA for small text.
  // There is a forbidden luminance band (0.183 to 0.270) where neither white nor
  // dark text reaches 4.5 — the ramp jumps it between the third and fourth step.
  it("keeps the day number at AA contrast on every step of both themes", () => {
    for (const theme of ["light", "dark"] as const) {
      for (const step of heatSteps(theme)) {
        expect(contrastRatio(step.background, step.foreground)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
