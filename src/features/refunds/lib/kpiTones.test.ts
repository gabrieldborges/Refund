import { describe, expect, it } from "vitest";
import { KPI_TONES, KPI_TONE_SEQUENCE } from "./kpiTones";
import { PALETTE, sliceColor, type DonutSlice } from "./chartPalette";

// WCAG relative luminance, which is NOT the weighted average readableTextOn uses
// to pick the text colour. Computing the real ratio here is the point: the picker
// is a heuristic, and this is what checks the heuristic actually landed somewhere
// legible.
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

const STATUS_SLICES: DonutSlice[] = [
  { id: "pending", labelKey: "status.pending", value: 0 },
  { id: "approved", labelKey: "status.approved", value: 0 },
  { id: "paid", labelKey: "status.paid", value: 0 },
  { id: "rejected", labelKey: "status.rejected", value: 0, isNegative: true },
];

describe("KPI_TONES", () => {
  // The bug this pins: the first version tried to be semantic on all three cards
  // and collided — the total and "Pendentes" both landed on #1D3557, two cards of
  // the same colour side by side. Three cards, three colours.
  it("gives each of the three cards a distinct background", () => {
    const backgrounds = KPI_TONE_SEQUENCE.map((tone) => tone.background);

    expect(new Set(backgrounds).size).toBe(3);
  });

  it("uses the chosen colour on the first card", () => {
    expect(KPI_TONES.total.background).toBe("#A8DADC");
  });

  // Two of the three keep meaning the entity: same colour as the donut gives that
  // status. If the palette or the slice order ever changes, these move together.
  it("matches the donut's colour for the two cards that name a status", () => {
    expect(KPI_TONES.settled.background).toBe(sliceColor(STATUS_SLICES, "approved"));
    expect(KPI_TONES.pending.background).toBe(sliceColor(STATUS_SLICES, "pending"));
  });

  it("draws every background from the chart palette", () => {
    for (const tone of KPI_TONE_SEQUENCE) {
      expect(PALETTE).toContain(tone.background);
    }
  });

  // The requirement behind "text colours respecting contrast", as a number rather
  // than an opinion. 4.5:1 is WCAG AA for normal-size text; the card values are
  // large, but the uppercase label above them is small, so the stricter bar is the
  // right one.
  it("keeps every card's text at AA contrast or better", () => {
    for (const tone of KPI_TONE_SEQUENCE) {
      expect(contrastRatio(tone.background, tone.foreground)).toBeGreaterThanOrEqual(4.5);
    }
  });

  // The sequence is what both screens iterate, so its order is part of the
  // contract: the dashboard and the Home must not drift apart.
  it("exposes the three tones in card order", () => {
    expect(KPI_TONE_SEQUENCE).toEqual([
      KPI_TONES.total,
      KPI_TONES.settled,
      KPI_TONES.pending,
    ]);
  });
});
