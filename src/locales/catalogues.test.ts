import { describe, it, expect } from "vitest";
import ptBR from "./pt-BR.json";
import enUS from "./en-US.json";

// The failure this guards against is silent by construction: a key added to
// pt-BR and forgotten in en-US renders the raw key ("home.requested") to an
// English-speaking user, and every Portuguese test still passes. Nothing else
// in the suite can see it, because the suite runs in pt-BR.
describe("translation catalogues", () => {
  const ptKeys = Object.keys(ptBR).sort();
  const enKeys = Object.keys(enUS).sort();

  it("define exactly the same keys", () => {
    expect(enKeys).toEqual(ptKeys);
  });

  it("leave no value empty", () => {
    for (const [locale, catalogue] of [
      ["pt-BR", ptBR],
      ["en-US", enUS],
    ] as const) {
      for (const [key, value] of Object.entries(catalogue)) {
        expect(value.trim(), `${locale} → ${key}`).not.toBe("");
      }
    }
  });

  // A plural key is only useful if every CLDR category the locale needs is
  // present. Both languages here have two (one/other), so a key with _one must
  // have _other and vice versa — a missing half falls back to the key itself
  // at exactly the count that triggers it, which is the hardest case to spot
  // by hand.
  it("pair every plural key with its counterpart", () => {
    for (const [locale, catalogue] of [
      ["pt-BR", ptBR],
      ["en-US", enUS],
    ] as const) {
      const keys = Object.keys(catalogue);
      for (const key of keys) {
        if (key.endsWith("_one")) {
          expect(keys, `${locale} → ${key}`).toContain(key.replace(/_one$/, "_other"));
        }
        if (key.endsWith("_other")) {
          expect(keys, `${locale} → ${key}`).toContain(key.replace(/_other$/, "_one"));
        }
        // _zero is optional (it overrides CLDR rather than completing it), but
        // a key that has it must still carry the two mandatory categories.
        if (key.endsWith("_zero")) {
          expect(keys, `${locale} → ${key}`).toContain(key.replace(/_zero$/, "_one"));
          expect(keys, `${locale} → ${key}`).toContain(key.replace(/_zero$/, "_other"));
        }
      }
    }
  });

  // Copy that is identical in both languages is usually a forgotten
  // translation rather than a deliberate choice. Some coincidences are real —
  // "Dashboard", "Status" and "Total" are the same word in both — so this
  // asserts the known list rather than the absence of duplicates, and fails
  // when the list grows without someone deciding it should. It already caught
  // one entry (common.total) that had not been thought about.
  it("share copy only where both languages genuinely agree", () => {
    const shared = Object.keys(ptBR).filter(
      (key) => ptBR[key as keyof typeof ptBR] === enUS[key as keyof typeof enUS]
    );

    // routes.dashboard joined the list with the dashboard cycle: it is the page
    // title for the same screen nav.dashboard labels, so it is the same word for
    // the same reason — deliberate, not forgotten.
    expect(shared.sort()).toEqual([
      "common.status",
      "common.total",
      "nav.dashboard",
      "routes.dashboard",
    ]);
  });
});
