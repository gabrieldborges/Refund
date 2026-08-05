import { CalendarDays, LayoutDashboard, ReceiptText, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  // A catalogue key, not display text. This module is data, evaluated once at
  // import time, so it cannot call t() — the component that renders the item
  // translates it.
  labelKey: string;
  to: string;
  icon: LucideIcon;
  enabled: boolean;
}

// Only the refunds entry is live now; the rest are placeholders for future
// cycles.
export const NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.refunds", to: "/", icon: ReceiptText, enabled: true },
  { labelKey: "nav.dashboard", to: "/dashboard", icon: LayoutDashboard, enabled: false },
  { labelKey: "nav.team", to: "/team", icon: Users, enabled: false },
  { labelKey: "nav.calendar", to: "/calendar", icon: CalendarDays, enabled: false },
];
