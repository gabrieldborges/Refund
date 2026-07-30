import { describe, it, expect } from "vitest";
import { REFUND_STATUS } from "./status";

// PageHome's automated coverage only ever renders a "pending" fixture, so the
// "approved" and "rejected" labels/variants never actually render in the
// suite — a typo in either (e.g. "Aprovado" -> "Aprovao") would ship
// unnoticed. This is a direct unit test over the map itself, independent of
// any fixture or rendered component.
describe("REFUND_STATUS", () => {
  it("labels pending in Portuguese with the secondary variant", () => {
    expect(REFUND_STATUS.pending).toEqual({ label: "Pendente", variant: "secondary" });
  });

  it("labels approved in Portuguese with the default variant", () => {
    expect(REFUND_STATUS.approved).toEqual({ label: "Aprovado", variant: "default" });
  });

  it("labels rejected in Portuguese with the destructive variant", () => {
    expect(REFUND_STATUS.rejected).toEqual({ label: "Rejeitado", variant: "destructive" });
  });

  it("labels paid in Portuguese with the outline variant", () => {
    expect(REFUND_STATUS.paid).toEqual({ label: "Pago", variant: "outline" });
  });
});
