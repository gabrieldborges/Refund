import { useEffect } from "react";
import { useUiStore, resolveTheme } from "@/stores/ui";

// Applies the resolved theme to <html data-theme>. Renders nothing.
export default function ThemeEffect() {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = resolveTheme(theme);
  }, [theme]);

  return null;
}
