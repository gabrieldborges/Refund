import { UtensilsCrossed, Bed, Car, Monitor, Wrench, type LucideIcon } from "lucide-react";

export type RefundCategory = "food" | "lodging" | "transport" | "service" | "others";

// labelKey, não label: avaliado na importação, antes de existir locale.
export const CATEGORIES: Record<RefundCategory, { labelKey: string; icon: LucideIcon }> = {
  food: { labelKey: "category.food", icon: UtensilsCrossed },
  lodging: { labelKey: "category.lodging", icon: Bed },
  transport: { labelKey: "category.transport", icon: Car },
  service: { labelKey: "category.service", icon: Wrench },
  others: { labelKey: "category.others", icon: Monitor },
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORIES).map(([value, { labelKey }]) => ({
  value: value as RefundCategory,
  labelKey,
}));

// Tupla de valores (não só o tipo) — o z.enum do Zod precisa disso em tempo
// de execução pra validar, não só o tipo RefundCategory em tempo de compilação.
export const CATEGORY_VALUES = Object.keys(CATEGORIES) as [RefundCategory, ...RefundCategory[]];
