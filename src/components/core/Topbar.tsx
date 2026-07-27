import MenuIcon from "@mui/icons-material/Menu";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useUiStore, resolveTheme } from "@/stores/ui";
import Button from "../molecules/Button";

interface TopbarProps {
  title: string;
  onNewRefund: () => void;
  onOpenSidebar: () => void;
}

export default function Topbar({ title, onNewRefund, onOpenSidebar }: TopbarProps) {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const isDark = resolveTheme(theme) === "dark";

  return (
    <header className="flex items-center gap-3 border-b border-line bg-surface px-4 sm:px-6 h-14">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Abrir menu"
        className="md:hidden text-content cursor-pointer flex items-center"
      >
        <MenuIcon aria-hidden fontSize="small" />
      </button>

      <h1 className="text-content font-semibold text-base sm:text-lg truncate">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Alternar tema"
          className="text-content cursor-pointer flex items-center"
        >
          {isDark ? <DarkModeIcon aria-hidden fontSize="small" /> : <LightModeIcon aria-hidden fontSize="small" />}
        </button>
        <Button variant="primary" size="fit" onClick={onNewRefund}>
          Nova solicitação
        </Button>
      </div>
    </header>
  );
}
