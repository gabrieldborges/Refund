import type { RefundStatus } from "../schemas/refund";

// Chave do catálogo (não o rótulo) e a variante do Badge do design system.
// Este módulo é avaliado uma vez, na importação, antes de qualquer locale
// existir — por isso guarda a chave e deixa a tradução para quem renderiza.
// Nenhum token de cor novo é criado: as quatro variantes já existem em
// src/components/ui/badge.
export const REFUND_STATUS: Record<
  RefundStatus,
  { labelKey: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { labelKey: "status.pending", variant: "secondary" },
  approved: { labelKey: "status.approved", variant: "default" },
  rejected: { labelKey: "status.rejected", variant: "destructive" },
  paid: { labelKey: "status.paid", variant: "outline" },
};

// Ordem de exibição no filtro: o ciclo de vida de uma solicitação, não a
// ordem alfabética nem a ordem das chaves do Record acima.
export const STATUS_FILTER_ORDER: readonly RefundStatus[] = [
  "pending",
  "approved",
  "paid",
  "rejected",
];
