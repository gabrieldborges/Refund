import { CalendarDays, LayoutDashboard, ReceiptText, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  enabled: boolean;
}

// Only "Solicitações" is live now; the rest are placeholders for future cycles.
export const NAV_ITEMS: NavItem[] = [
  { label: "Solicitações", to: "/", icon: ReceiptText, enabled: true },
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, enabled: false },
  { label: "Time", to: "/team", icon: Users, enabled: false },
  { label: "Calendário", to: "/calendar", icon: CalendarDays, enabled: false },
];
