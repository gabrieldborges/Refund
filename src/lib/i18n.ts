import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import type { Locale } from "@/stores/ui";

// Catalogues are loaded on demand, one per locale, so a visitor who never
// switches languages never downloads the other catalogue. This is what makes
// the bootstrap asynchronous — and why main.tsx has to await it before the
// first render instead of rendering and patching the text in afterwards.
const catalogues: Record<Locale, () => Promise<{ default: Record<string, string> }>> = {
  "pt-BR": () => import("@/locales/pt-BR.json"),
  "en-US": () => import("@/locales/en-US.json"),
};

// Keys are flat and dotted ("nav.refunds"), so the separator that i18next
// would otherwise use to walk a nested object has to be turned off. Without
// this, "nav.refunds" would be read as object `nav` → property `refunds`.
const KEY_SEPARATOR = false as const;
const NAMESPACE_SEPARATOR = false as const;

async function loadCatalogue(locale: Locale): Promise<Record<string, string>> {
  const module = await catalogues[locale]();
  return module.default;
}

// Called once, before the app renders. Rendering first and loading after is
// what produces a flash of the wrong language (or of raw keys), which is the
// failure this whole item exists to avoid.
export async function initI18n(locale: Locale) {
  const resources = await loadCatalogue(locale);

  await i18next.use(initReactI18next).init({
    lng: locale,
    fallbackLng: false,
    resources: { [locale]: { translation: resources } },
    keySeparator: KEY_SEPARATOR,
    nsSeparator: NAMESPACE_SEPARATOR,
    interpolation: {
      // React already escapes anything it renders; escaping again here would
      // turn a name like "Sá & Cia" into "S&#225; &amp; Cia" on screen.
      escapeValue: false,
    },
  });

  return i18next;
}

// Switching at runtime repeats the same two steps: fetch the catalogue, then
// hand it to i18next. addResourceBundle is a no-op cost when the bundle is
// already there, so switching back to a previously used locale is instant.
export async function changeLocale(locale: Locale) {
  if (!i18next.hasResourceBundle(locale, "translation")) {
    const resources = await loadCatalogue(locale);
    i18next.addResourceBundle(locale, "translation", resources);
  }

  await i18next.changeLanguage(locale);
}

export default i18next;
