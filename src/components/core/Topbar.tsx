import { Languages, Moon, Sun } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useUiStore, resolveTheme } from "@/stores/ui";
import { useTranslation } from "react-i18next";
import { changeLocale } from "@/lib/i18n";

interface TopbarProps {
  title: string;
  onNewRefund: () => void;
}

export default function Topbar({ title, onNewRefund }: TopbarProps) {
  const { t } = useTranslation();
  const locale = useUiStore((s) => s.locale);
  const setLocale = useUiStore((s) => s.setLocale);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const isDark = resolveTheme(theme) === "dark";

  // The store records the choice; lib/i18n.ts loads the catalogue. Both are
  // needed, and in this order: persisting first means a failed download still
  // leaves the preference for the next boot, where it is awaited properly.
  async function handleToggleLocale() {
    const next = locale === "pt-BR" ? "en-US" : "pt-BR";
    setLocale(next);
    await changeLocale(next);
  }

  return (
    // h-17.5 matches SidebarHeader's height in Sidebar.tsx so the two bottom
    // borders line up across the sidebar/topbar seam.
    <header className="flex h-17.5 shrink-0 items-center gap-3 border-b pr-6 ">
      {/* shadcn ships a hardcoded English accessible name ("Toggle Sidebar"),
          which would survive a language switch. Overriding it with a catalogue
          key keeps the trigger consistent with the active locale. */}
      <SidebarTrigger aria-label={t("shell.toggleMenu")} className=" h-17.5 w-17.5 border-r rounded-l-none"/>
      
      <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("shell.toggleLocale")}
          onClick={handleToggleLocale}
        >
          <Languages className="size-4" aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" aria-label={t("shell.toggleTheme")} onClick={toggleTheme}>
          {isDark ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
        </Button>
        <Button onClick={onNewRefund}>{t("shell.newRefund")}</Button>
      </div>
    </header>
  );
}
