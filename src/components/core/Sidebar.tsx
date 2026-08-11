import { Languages, LogOut, Moon, Sun } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/useAuth";
import { changeLocale } from "@/lib/i18n";
import { initialsFromName, usernameFromEmail } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { useUiStore, resolveTheme } from "@/stores/ui";
import { NAV_ITEMS } from "./nav-items";

// Um controle de preferência com a forma de card: ícone em cima, rótulo
// centralizado embaixo. `aria-label` além do texto visível porque na trilha
// recolhida do desktop o rótulo some da tela — sem ele o botão ficaria sem
// nome acessível justamente no estado em que ninguém consegue lê-lo.
function PreferenceCard({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border border-sidebar-border bg-sidebar p-2 text-sidebar-foreground transition",
        "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        // Recolhido: vira um quadrado de ícone, sem borda nem rótulo, para não
        // desenhar uma caixa maior que a própria trilha de 48px.
        "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:flex-none",
        "group-data-[collapsible=icon]:self-center group-data-[collapsible=icon]:border-0",
        "group-data-[collapsible=icon]:p-0"
      )}
    >
      {icon}
      {/* O rótulo trunca em vez de quebrar: "Alternar idioma" em duas linhas
          deixaria os dois cards com alturas diferentes. */}
      <span className="w-full truncate text-center text-xs leading-tight group-data-[collapsible=icon]:hidden">
        {label}
      </span>
    </button>
  );
}

export default function AppSidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locale = useUiStore((s) => s.locale);
  const setLocale = useUiStore((s) => s.setLocale);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const isDark = resolveTheme(theme) === "dark";
  // No mobile o menu é uma gaveta sobreposta: navegar sem fechá-la deixa a
  // página nova escondida atrás do painel, e o usuário precisa de um segundo
  // toque só para ver o resultado do primeiro. No desktop o menu é parte do
  // layout e `isMobile` é false, então nada fecha.
  const { isMobile, setOpenMobile } = useSidebar();

  function closeOnMobile() {
    if (isMobile) setOpenMobile(false);
  }

  function handleLogout() {
    closeOnMobile();
    logout();
    navigate("/login");
  }

  // The store records the choice; lib/i18n.ts loads the catalogue. Both are
  // needed, and in this order: persisting first means a failed download still
  // leaves the preference for the next boot, where it is awaited properly.
  async function handleToggleLocale() {
    const next = locale === "pt-BR" ? "en-US" : "pt-BR";
    setLocale(next);
    await changeLocale(next);
  }

  return (
    <Sidebar collapsible="icon">
      {/* h-17.5 matches Topbar's header height so the two bottom borders line
          up across the sidebar/topbar seam. */}
      <SidebarHeader
        className="h-17.5 flex-row items-center gap-3 border-b border-sidebar-border p-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-2"
      >
        {user && (
          <>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initialsFromName(user.name)}
            </span>
            <span className="min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="block truncate text-sm font-semibold text-sidebar-foreground">{user.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{usernameFromEmail(user.email)}</span>
            </span>
          </>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {/* pl-2 (not translate-x-2) shifts the icon right: translate repaints
              content without moving the layout box, so the hover background
              (tied to the box) stayed put and left an unhighlighted strip on
              the left. Padding moves the box itself, so hover now fills the
              row. In the collapsed/icon rail, the shrunk 32px button has no
              internal slack to redistribute (its own p-2! padding already
              centers a 16px icon exactly) — what needs centering is the whole
              button *within* the wider 48px rail, so that centering belongs
              on the row (SidebarMenuItem), not inside the button. */}
          {/* Itens admin-only somem para quem não é admin, em vez de aparecerem
              desabilitados: um item cinza sugere "ainda não", e este não é o
              caso — a pessoa nunca vai poder abri-lo. O selo "em breve" continua
              sendo para o que ainda não existe. */}
          {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin").map((item) => {
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.to}  className="h-17.5 flex items-center group-data-[collapsible=icon]:justify-center">
                {item.enabled ? (
                  <SidebarMenuButton asChild isActive={location.pathname === item.to} tooltip={t(item.labelKey)} className="pl-4 hover:bg-accent! h-full hover:text-accent-foreground! dark:hover:bg-accent/50!" >
                    <Link to={item.to} onClick={closeOnMobile} className=" bg-sidebar!">
                      <Icon aria-hidden />
                      <span >{t(item.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <div className=" flex items-center justify-between w-full h-full pl-2">
                    <SidebarMenuButton type="button" disabled tooltip={t(item.labelKey)} className=" w-fit">
                      <Icon aria-hidden />
                      <span>{t(item.labelKey)}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="pr-5 text-sidebar-ring ">{t("nav.comingSoon")}</SidebarMenuBadge>
                  </div>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Idioma e tema moraram na Topbar até aqui. São preferências, não a ação
          principal de nenhuma tela, e disputavam espaço com o título e com
          "Nova solicitação" — no iPhone 12 Pro isso truncava o título da rota
          ("Revis…"). No rodapé do menu eles ficam junto do Sair, que é da mesma
          natureza, e a Topbar sobra inteira para título + ação. */}
      <SidebarFooter>
        {/* Idioma e tema como dois cards lado a lado — ícone em cima, rótulo
            centralizado embaixo — em vez de duas linhas de menu iguais às da
            navegação. São preferências, não destinos, e a forma diferente é o
            que diz isso antes de qualquer texto ser lido.

            `flex-1` nos dois com `min-w-0`: eles dividem a largura disponível
            em partes iguais e encolhem juntos, sem depender de uma largura
            fixa que quebraria na gaveta estreita do mobile.

            Na trilha recolhida do desktop (48px) não cabem dois lado a lado, e
            aí eles voltam a empilhar e escondem o rótulo — é o que os
            group-data-[collapsible=icon] fazem. */}
        <div className="flex gap-2 px-2 pb-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:px-0">
          <PreferenceCard
            label={t("shell.toggleLocale")}
            onClick={handleToggleLocale}
            icon={<Languages className="size-4" aria-hidden />}
          />
          <PreferenceCard
            label={t("shell.toggleTheme")}
            onClick={toggleTheme}
            icon={
              isDark ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />
            }
          />
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton type="button" onClick={handleLogout} tooltip={t("shell.logout")}>
              <LogOut aria-hidden />
              <span>{t("shell.logout")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
