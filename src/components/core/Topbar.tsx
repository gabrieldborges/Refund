import { Moon, Sun } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useUiStore, resolveTheme } from "@/stores/ui";

interface TopbarProps {
  title: string;
  onNewRefund: () => void;
}

export default function Topbar({ title, onNewRefund }: TopbarProps) {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const isDark = resolveTheme(theme) === "dark";

  return (
    // h-17.5 matches SidebarHeader's height in Sidebar.tsx so the two bottom
    // borders line up across the sidebar/topbar seam.
    <header className="flex h-17.5 shrink-0 items-center gap-3 border-b pr-6 ">
      {/* shadcn's built-in accessible name is English ("Toggle Sidebar"); this
          project's UI text is Portuguese, so it is overridden explicitly. */}
      <SidebarTrigger aria-label="Alternar menu" className=" h-17.5 w-17.5 border-r rounded-l-none"/>
      
      <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Alternar tema" onClick={toggleTheme}>
          {isDark ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
        </Button>
        <Button onClick={onNewRefund}>Nova solicitação</Button>
      </div>
    </header>
  );
}
