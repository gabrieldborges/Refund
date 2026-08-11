import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface TopbarProps {
  title: string;
  onNewRefund: () => void;
}

export default function Topbar({ title, onNewRefund }: TopbarProps) {
  const { t } = useTranslation();

  return (
    // h-17.5 matches SidebarHeader's height in Sidebar.tsx so the two bottom
    // borders line up across the sidebar/topbar seam.
    <header className="flex h-17.5 shrink-0 items-center gap-3 border-b pr-4 sm:pr-6">
      {/* shadcn ships a hardcoded English accessible name ("Toggle Sidebar"),
          which would survive a language switch. Overriding it with a catalogue
          key keeps the trigger consistent with the active locale. */}
      <SidebarTrigger aria-label={t("shell.toggleMenu")} className="h-17.5 w-17.5 shrink-0 border-r rounded-l-none" />

      {/* min-w-0 é o que faz o truncate funcionar de verdade: sem ele o <h1>
          herda a largura mínima automática do conteúdo e, em vez de encurtar,
          empurra o botão da direita para fora da tela. Com ele, o título cede
          espaço primeiro — e como idioma e tema saíram daqui (foram para o
          rodapé do menu), o que sobra para ceder já é bem mais. */}
      <h1 className="min-w-0 truncate text-base font-semibold sm:text-lg">{title}</h1>

      <Button className="ml-auto shrink-0" onClick={onNewRefund}>
        {t("shell.newRefund")}
      </Button>
    </header>
  );
}
