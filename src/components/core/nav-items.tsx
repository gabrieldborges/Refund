import type { ReactNode } from "react";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupIcon from "@mui/icons-material/Group";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

export interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
  enabled: boolean;
}

// Only "Solicitações" is live now; the rest are placeholders for future cycles.
export const NAV_ITEMS: NavItem[] = [
  { label: "Solicitações", to: "/", icon: <ReceiptLongIcon fontSize="small" />, enabled: true },
  { label: "Dashboard", to: "/dashboard", icon: <DashboardIcon fontSize="small" />, enabled: false },
  { label: "Time", to: "/team", icon: <GroupIcon fontSize="small" />, enabled: false },
  { label: "Calendário", to: "/calendar", icon: <CalendarMonthIcon fontSize="small" />, enabled: false },
];
