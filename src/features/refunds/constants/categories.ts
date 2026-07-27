import { UtensilsCrossed, Bed, Car, Monitor, Wrench, type LucideIcon } from "lucide-react";

export type RefundCategory = "food" | "lodging" | "transport" | "service" | "others";

export const CATEGORIES: Record<RefundCategory, { label: string; icon: LucideIcon }> = {
  food: { label: "Alimentação", icon: UtensilsCrossed },
  lodging: { label: "Hospedagem", icon: Bed },
  transport: { label: "Transporte", icon: Car },
  service: { label: "Serviços", icon: Wrench },
  others: { label: "Outros", icon: Monitor },
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORIES).map(([value, { label }]) => ({
  value: value as RefundCategory,
  label,
}));

// Tupla de valores (não só o tipo) — o z.enum do Zod precisa disso em tempo
// de execução pra validar, não só o tipo RefundCategory em tempo de compilação.
export const CATEGORY_VALUES = Object.keys(CATEGORIES) as [RefundCategory, ...RefundCategory[]];
