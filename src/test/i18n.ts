import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import ptBR from "@/locales/pt-BR.json";
import enUS from "@/locales/en-US.json";
import type { Locale } from "@/stores/ui";

// Test-only counterpart to lib/i18n.ts.
//
// Production loads one catalogue on demand and awaits it before the first
// render. Tests cannot await anything before a render they do not control, so
// both catalogues are imported statically and registered up front. The
// trade-off is deliberate: the test bundle carries both, which costs nothing,
// and in exchange no test has to know that i18n is asynchronous.
//
// pt-BR is the active language, so assertions keep matching the Portuguese
// text a real user sees rather than translation keys.
export function initI18nForTests() {
  if (i18next.isInitialized) return i18next;

  void i18next.use(initReactI18next).init({
    lng: "pt-BR",
    fallbackLng: false,
    resources: {
      "pt-BR": { translation: ptBR },
      "en-US": { translation: enUS },
    },
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
  });

  return i18next;
}

// Lets a test assert the English copy without going through the store or the
// dynamic import. Remember to switch back — i18next is module-level state.
export async function setTestLocale(locale: Locale) {
  await i18next.changeLanguage(locale);
}
