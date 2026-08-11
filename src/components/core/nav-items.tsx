import { CalendarDays, LayoutDashboard, ReceiptText, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  // A catalogue key, not display text. This module is data, evaluated once at
  // import time, so it cannot call t() — the component that renders the item
  // translates it.
  labelKey: string;
  to: string;
  icon: LucideIcon;
  enabled: boolean;
  // Some da sidebar para quem não é admin. A rota tem guarda própria
  // (requireAdmin, em router-loaders.ts) e a API recusa de qualquer forma
  // (BR-025); esta prop só evita mostrar um caminho que seria recusado.
  adminOnly?: boolean;
}

// Dashboard e Calendário seguem como placeholders dos ciclos 2 e 3 do panorama
// das três telas.
export const NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.refunds", to: "/", icon: ReceiptText, enabled: true },
  { labelKey: "nav.dashboard", to: "/dashboard", icon: LayoutDashboard, enabled: false },
  { labelKey: "nav.team", to: "/team", icon: Users, enabled: true, adminOnly: true },
  { labelKey: "nav.calendar", to: "/calendar", icon: CalendarDays, enabled: false },
];
