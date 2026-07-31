import type { RefundStatus } from "../schemas/refund";

// Rótulo em português e a variante do Badge do design system. Nenhum token de
// cor novo é criado: as quatro variantes já existem em src/components/ui/badge.
export const REFUND_STATUS: Record<
  RefundStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pendente", variant: "secondary" },
  approved: { label: "Aprovado", variant: "default" },
  rejected: { label: "Rejeitado", variant: "destructive" },
  paid: { label: "Pago", variant: "outline" },
};

// Ordem de exibição no filtro: o ciclo de vida de uma solicitação, não a
// ordem alfabética nem a ordem das chaves do Record acima.
export const STATUS_FILTER_ORDER: readonly RefundStatus[] = [
  "pending",
  "approved",
  "paid",
  "rejected",
];
