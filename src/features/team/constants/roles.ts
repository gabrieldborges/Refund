import type { UserRole } from "../schemas/user";

// labelKey, e não texto pronto: este módulo é avaliado na importação, antes de
// existir um locale. Mesmo padrão de REFUND_STATUS e CATEGORIES.
//
// A variante é do design system — nenhuma cor nova entra por aqui.
export const USER_ROLE: Record<UserRole, { labelKey: string; variant: "default" | "secondary" }> = {
  admin: { labelKey: "team.roleAdmin", variant: "default" },
  standard: { labelKey: "team.roleStandard", variant: "secondary" },
};
