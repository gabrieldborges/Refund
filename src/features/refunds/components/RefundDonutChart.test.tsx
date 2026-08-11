import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RefundDonutChart from "./RefundDonutChart";
import { readableTextOn, sliceColor, type DonutSlice } from "../lib/chartPalette";

// Slices in the shape RequesterPanel builds them: the four UC-014 statuses,
// with "rejected" flagged as the negative one.
const SLICES: DonutSlice[] = [
  { id: "pending", labelKey: "status.pending", value: 2, isNegative: false },
  { id: "approved", labelKey: "status.approved", value: 5, isNegative: false },
  { id: "paid", labelKey: "status.paid", value: 3, isNegative: false },
  { id: "rejected", labelKey: "status.rejected", value: 1, isNegative: true },
];

function renderChart(props: Partial<React.ComponentProps<typeof RefundDonutChart>> = {}) {
  return render(
    <RefundDonutChart
      slices={SLICES}
      unitLabelKey="chart.requestsUnit"
      titleKey="chart.statusTitle"
      metric="count"
      {...props}
    />
  );
}

// The palette is asserted through sliceColor rather than through the rendered
// SVG on purpose. jsdom has no layout engine, so nivo measures its container as
// 0x0 and draws no arcs at all — fills simply do not exist to query. The colour
// rule is the one piece of real logic in the component, so it is tested where
// it can actually be observed.
describe("sliceColor", () => {
  it("reserves the red for the negative slice", () => {
    expect(sliceColor(SLICES, "rejected")).toBe("#E63946");
  });

  // The point of the reservation: red means "rejected", not "smallest". A
  // rejected slice that happens to be the LARGEST must still be red, and must
  // not take the first palette colour from the others.
  it("keeps the red on the negative slice even when it is the largest", () => {
    const rejectedIsLargest: DonutSlice[] = [
      { id: "rejected", labelKey: "status.rejected", value: 99, isNegative: true },
      { id: "approved", labelKey: "status.approved", value: 5 },
      { id: "pending", labelKey: "status.pending", value: 2 },
    ];

    expect(sliceColor(rejectedIsLargest, "rejected")).toBe("#E63946");
    expect(sliceColor(rejectedIsLargest, "approved")).toBe("#1D3557");
    expect(sliceColor(rejectedIsLargest, "pending")).toBe("#457B9D");
  });

  // The negative slice must not consume a palette position. If it did, the two
  // slices either side of it would skip a colour for no visible reason.
  it("does not let the negative slice consume a palette position", () => {
    expect(sliceColor(SLICES, "pending")).toBe("#1D3557");
    expect(sliceColor(SLICES, "approved")).toBe("#457B9D");
    expect(sliceColor(SLICES, "paid")).toBe("#A8DADC");
  });
});

// nivo's own example paints the in-slice number with `darker 2` applied to the
// slice colour, which only reads because its default palette is entirely
// pastel. Half of ours is not, so the rule had to become luminance-based. These
// assertions are what stop someone from "restoring" the original modifier and
// silently printing near-black digits on the navy slice.
describe("readableTextOn", () => {
  it("uses light text on the dark slices", () => {
    expect(readableTextOn("#1D3557")).toBe("#FFFFFF");
    expect(readableTextOn("#457B9D")).toBe("#FFFFFF");
    expect(readableTextOn("#E63946")).toBe("#FFFFFF");
  });

  it("uses dark text on the light slices", () => {
    expect(readableTextOn("#A8DADC")).toBe("#1F2933");
    expect(readableTextOn("#F1FAEE")).toBe("#1F2933");
  });
});

// KNOWN BLIND SPOT, recorded because it already cost one bug.
//
// Nothing below can assert what the chart actually DRAWS. ResponsivePie sizes
// itself through react-virtualized-auto-sizer, which measures its parent on
// mount; jsdom has no layout engine, so that measurement is 0x0 and AutoSizer
// deliberately renders nothing at that size — not even an <svg>. Two escapes
// were tried and both failed: nivo's defaultWidth/defaultHeight (the mount
// measurement overwrites them) and vi.mock on the measurer (it does not reach
// the import inside @nivo/core, even with the dep inlined).
//
// The bug it hid: nivo's `arcLinkLabel` accessor defaults to the literal string
// "id", not "label", so the leader lines printed the API contract's English ids
// ("pending") and ignored the app's language. The accessible name asserted
// below is built from our own t(labelKey), so it was correctly Portuguese the
// whole time — these tests were green while the screen was wrong.
//
// Anything that lives only inside nivo's SVG — leader-line text, the bottom
// legend, in-slice numbers, arc colours — has to be checked in a browser.
describe("RefundDonutChart", () => {
  // Every number the chart draws must also exist in its accessible name: a
  // screen reader user cannot see slices, and "donut chart" says nothing.
  it("describes the total and every slice in its accessible name", () => {
    renderChart();

    const chart = screen.getByRole("img", { name: /Solicitações por status/ });
    const label = chart.getAttribute("aria-label") ?? "";

    expect(label).toContain("11 solicitações");
    expect(label).toContain("Pendente: 2");
    expect(label).toContain("Aprovado: 5");
    expect(label).toContain("Pago: 3");
    expect(label).toContain("Rejeitado: 1");
  });

  // The unit under the centre total is pluralised through i18next's count, not
  // hardcoded: a requester with a single refund read "1 solicitações". The
  // fixture above sums to 11, so the plural form is covered by the test before
  // this one; here the total is deliberately 1.
  it("uses the singular unit when the total is one", () => {
    renderChart({
      slices: [{ id: "pending", labelKey: "status.pending", value: 1 }],
    });

    const chart = screen.getByRole("img", { name: /Solicitações por status/ });
    const label = chart.getAttribute("aria-label") ?? "";

    expect(label).toContain("1 solicitação");
    expect(label).not.toContain("1 solicitações");
  });

  // Money and counts cannot share a formatter: one is a whole number, the other
  // has cents and a currency symbol. The values arrive in cents.
  it("formats a currency metric as BRL", () => {
    renderChart({
      metric: "currency",
      slices: [
        { id: "approved", labelKey: "status.approved", value: 65000 },
        { id: "rejected", labelKey: "status.rejected", value: 10000, isNegative: true },
      ],
    });

    const chart = screen.getByRole("img", { name: /Solicitações por status/ });
    // Non-breaking space between symbol and digits — that is what Intl emits
    // for pt-BR, so the assertion has to use it rather than a plain space.
    expect(chart.getAttribute("aria-label")).toContain("R$ 750,00");
  });

  it("shows a skeleton while the data is loading", () => {
    const { container } = renderChart({ isLoading: true });

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  // An error must never fall through to a rendered zero: an all-zero donut is
  // indistinguishable from a requester who genuinely has nothing.
  it("shows an alert instead of a chart when the data failed to load", () => {
    renderChart({ isError: true });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os dados do gráfico."
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  // A donut of four zero-value slices would draw nothing at all — a ring-shaped
  // hole with no arcs. Say so in words instead.
  it("shows a message instead of an empty ring when every slice is zero", () => {
    renderChart({
      slices: SLICES.map((slice) => ({ ...slice, value: 0 })),
    });

    expect(screen.getByText("Nada para exibir ainda.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  // The mobile clipping this fixes: nivo draws the leader-line label INSIDE the
  // side margin, and the SVG clips whatever exceeds it. On a 390px screen the
  // margin that fits is narrower than the longest label ("Rejeitado", ~60px at
  // 13px), so the word was cut off — the reported symptom.
  //
  // Asserting the accessible name and not SVG geometry, for the reason recorded at
  // the top of this file: jsdom has no layout engine, so nivo measures the
  // container as 0x0 and draws no marks at all. What this pins is that turning the
  // leader lines off on mobile loses NO information — every slice is still named,
  // with its value, in the accessible name, and the legend carries identity
  // visually.
  it("still names every slice on a narrow viewport, with no leader lines", () => {
    const original = window.innerWidth;
    // use-mobile reads innerWidth on mount, so this has to be set before render.
    window.innerWidth = 390;

    try {
      render(
        <RefundDonutChart
          slices={SLICES}
          unitLabelKey="chart.requestsUnit"
          titleKey="chart.statusTitle"
          metric="count"
        />
      );

      const chart = screen.getByRole("img");
      for (const label of ["Pendente", "Aprovado", "Pago", "Rejeitado"]) {
        expect(chart).toHaveAccessibleName(new RegExp(label));
      }
    } finally {
      window.innerWidth = original;
    }
  });
});
