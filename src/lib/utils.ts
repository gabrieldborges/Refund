import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Every shadcn component funnels its classes through this helper: clsx resolves
// conditionals, twMerge drops earlier Tailwind utilities that a later one
// overrides (so a caller's `px-8` really beats the component's `px-4`).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
