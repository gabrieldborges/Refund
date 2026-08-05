import { describe, it, expect } from "vitest";
import i18next from "i18next";
import { REFUND_STATUS } from "./status";
import ptBR from "@/locales/pt-BR.json";
import enUS from "@/locales/en-US.json";

// PageHome's automated coverage only ever renders a "pending" fixture, so the
// other three labels never actually render in the suite — a typo would ship
// unnoticed. This is a direct unit test over the map itself, independent of
// any fixture or rendered component.
//
// Since the labels moved into the catalogues, asserting the map alone stopped
// being enough: REFUND_STATUS could hold a key no catalogue defines and still
// look correct here, while the screen rendered "status.paid" verbatim. Each
// case now asserts the pairing (key + variant) AND that the key resolves to
// real copy in both languages.
describe("REFUND_STATUS", () => {
  const cases = [
    { status: "pending", variant: "secondary", pt: "Pendente", en: "Pending" },
    { status: "approved", variant: "default", pt: "Aprovado", en: "Approved" },
    { status: "rejected", variant: "destructive", pt: "Rejeitado", en: "Rejected" },
    { status: "paid", variant: "outline", pt: "Pago", en: "Paid" },
  ] as const;

  it.each(cases)("maps $status to its variant and to copy in both locales", (testCase) => {
    const entry = REFUND_STATUS[testCase.status];

    expect(entry.variant).toBe(testCase.variant);
    expect(i18next.t(entry.labelKey, { lng: "pt-BR" })).toBe(testCase.pt);
    expect(i18next.t(entry.labelKey, { lng: "en-US" })).toBe(testCase.en);
  });

  // The cases above only cover the four statuses they name. This guards the
  // map as a whole against an entry pointing at a key neither catalogue has.
  it("uses only keys that both catalogues define", () => {
    for (const entry of Object.values(REFUND_STATUS)) {
      expect(ptBR).toHaveProperty(entry.labelKey);
      expect(enUS).toHaveProperty(entry.labelKey);
    }
  });
});
