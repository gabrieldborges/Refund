import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

// The locales the app ships a catalogue for. Kept here rather than in
// lib/i18n.ts because the store is the source of truth for the choice, and
// lib/i18n.ts imports this type — not the other way around.
export type Locale = "pt-BR" | "en-US";

export const DEFAULT_LOCALE: Locale = "pt-BR";

// Resolve "system" against the OS preference; explicit values pass through.
export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

interface UiState {
  theme: Theme;
  locale: Locale;
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: "system",
      locale: DEFAULT_LOCALE,
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      // Only records the choice. Loading the catalogue and telling i18next
      // about it is done by changeLocale (lib/i18n.ts), which has to await a
      // dynamic import and therefore cannot live inside a Zustand setter.
      setLocale: (locale) => set({ locale }),
      // Flip to the opposite of whatever is currently showing.
      toggleTheme: () =>
        set({ theme: resolveTheme(get().theme) === "dark" ? "light" : "dark" }),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      // Setter-shaped action: takes the explicit next value instead of flipping.
      // Needed to wire shadcn's `onOpenChange(open: boolean)` callback, which
      // passes an explicit boolean rather than requesting a flip.
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    { name: "refund-ui" },
  ),
);
