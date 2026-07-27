import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

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
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: "system",
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      // Flip to the opposite of whatever is currently showing.
      toggleTheme: () =>
        set({ theme: resolveTheme(get().theme) === "dark" ? "light" : "dark" }),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: "refund-ui" },
  ),
);
