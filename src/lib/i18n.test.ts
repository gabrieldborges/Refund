import { describe, it, expect, afterEach } from "vitest";
import i18next from "i18next";
import { formatCentsToBRL, formatDate } from "./format";
import { setTestLocale } from "@/test/i18n";
import { DEFAULT_LOCALE } from "@/stores/ui";

afterEach(async () => {
  await setTestLocale(DEFAULT_LOCALE);
});

describe("pluralisation", () => {
  // The point of moving off the hand-written ternary: i18next asks
  // Intl.PluralRules which category applies, so a locale with more than two
  // forms (Russian has three, Arabic six) works without touching the
  // component. Zero is not covered here — it turned out to need its own key,
  // for the reason spelled out in the test below.
  it("selects the singular and plural forms in Portuguese", () => {
    expect(i18next.t("home.requestCount", { count: 1 })).toBe("1 solicitação");
    expect(i18next.t("home.requestCount", { count: 2 })).toBe("2 solicitações");
  });

  // Zero needs its own key, and finding that out was the point of measuring.
  // CLDR puts 0 in Portuguese's "one" category (Intl.PluralRules("pt-BR")
  // .select(0) === "one"), so _one/_other alone would render "0 solicitação" —
  // a silent change from the hand-written ternary this replaced, which said
  // "0 solicitações". i18next checks an explicit _zero before consulting CLDR,
  // so the existing wording is preserved deliberately rather than by accident.
  it("keeps the plural wording at zero, overriding CLDR for Portuguese", () => {
    expect(new Intl.PluralRules("pt-BR").select(0)).toBe("one");
    expect(i18next.t("home.requestCount", { count: 0 })).toBe("0 solicitações");
  });

  it("selects the singular and plural forms in English", async () => {
    await setTestLocale("en-US");

    expect(i18next.t("home.requestCount", { count: 1 })).toBe("1 request");
    expect(i18next.t("home.requestCount", { count: 2 })).toBe("2 requests");
    expect(i18next.t("home.requestCount", { count: 0 })).toBe("0 requests");
  });

  // Interpolated values must reach the string, not be dropped or escaped.
  // escapeValue is off because React escapes on render; double-escaping would
  // put "&amp;" on screen for a name containing an ampersand.
  it("interpolates values without escaping them", () => {
    expect(i18next.t("receipt.expenseName", { name: "Sá & Cia" })).toBe(
      "Comprovante de Sá & Cia"
    );
  });
});

describe("locale-aware formatting", () => {
  // Currency stays BRL in both languages — the backend stores cents of real,
  // and swapping the symbol without converting the value would be a lie. What
  // changes is the writing convention.
  it("formats currency with the active locale's conventions", async () => {
    const inPortuguese = formatCentsToBRL(123456);
    await setTestLocale("en-US");
    const inEnglish = formatCentsToBRL(123456);

    expect(inPortuguese).toContain("1.234,56");
    expect(inEnglish).toContain("1,234.56");
    expect(inPortuguese).not.toBe(inEnglish);
  });

  it("formats dates with the active locale's order", async () => {
    const inPortuguese = formatDate("2026-03-09T00:00:00Z");
    await setTestLocale("en-US");
    const inEnglish = formatDate("2026-03-09T00:00:00Z");

    expect(inPortuguese).toBe("09/03/2026");
    expect(inEnglish).toBe("03/09/2026");
  });

  // The guards predate this item and must survive it: a null or unparseable
  // date renders an em dash rather than "Invalid Date" inside a table cell.
  it("keeps the em dash for missing and invalid dates in any locale", async () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not a date")).toBe("—");

    await setTestLocale("en-US");
    expect(formatDate(null)).toBe("—");
  });
});
