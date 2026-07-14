import ForkKnifeIcon from "../assets/icons/ForkKnife.svg?react";
import BedIcon from "../assets/icons/Bed.svg?react";
import PoliceCarIcon from "../assets/icons/PoliceCar.svg?react";
import WrenchIcon from "../assets/icons/Wrench.svg?react";
import DesktopTowerIcon from "../assets/icons/DesktopTower.svg?react";
import type Icon from "../components/atoms/Icon";
import type { ComponentProps } from "react";

export type RefundCategory = "food" | "lodging" | "transport" | "service" | "others";

export const CATEGORIES: Record<
  RefundCategory,
  { label: string; icon: ComponentProps<typeof Icon>["svg"] }
> = {
  food: { label: "Alimentação", icon: ForkKnifeIcon },
  lodging: { label: "Hospedagem", icon: BedIcon },
  transport: { label: "Transporte", icon: PoliceCarIcon },
  service: { label: "Serviços", icon: WrenchIcon },
  others: { label: "Outros", icon: DesktopTowerIcon },
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORIES).map(([value, { label }]) => ({
  value: value as RefundCategory,
  label,
}));

// Tupla de valores (não só o tipo) — o z.enum do Zod precisa disso em tempo
// de execução pra validar, não só o tipo RefundCategory em tempo de compilação.
export const CATEGORY_VALUES = Object.keys(CATEGORIES) as [RefundCategory, ...RefundCategory[]];
