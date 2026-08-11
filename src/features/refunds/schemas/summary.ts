import { z } from "zod";

const bucketSchema = z.object({
  count: z.number().int().nonnegative(),
  amount_in_cents: z.number().int().nonnegative(),
});

// z.object explícito, e NÃO z.record: as quatro chaves são obrigatórias por
// contrato (UC-017), e um record aceitaria uma resposta sem `paid` — que é
// exatamente o defeito que o preenchimento com zeros no servidor existe para
// evitar. O schema precisa exigir o que o contrato promete.
const byStatusSchema = z.object({
  pending: bucketSchema,
  approved: bucketSchema,
  paid: bucketSchema,
  rejected: bucketSchema,
});

// As cinco categorias, pela mesma razão. Espelha ALLOWED_CATEGORIES do backend.
const byCategorySchema = z.object({
  food: bucketSchema,
  lodging: bucketSchema,
  transport: bucketSchema,
  service: bucketSchema,
  others: bucketSchema,
});

const monthSchema = z.object({
  // "YYYY-MM". String simples de propósito: o cliente usa como rótulo e como
  // chave, nunca faz aritmética com ela.
  month: z.string(),
  count: z.number().int().nonnegative(),
  amount_in_cents: z.number().int().nonnegative(),
  by_status: byStatusSchema,
});

export const refundSummaryResponseSchema = z.object({
  type: z.literal("RefundSummary"),
  // O único campo pelo qual o cliente sabe se está lendo a empresa ou uma pessoa.
  scope: z.enum(["all", "user"]),
  months: z.number().int().min(1).max(12),
  by_status: byStatusSchema,
  by_category: byCategorySchema,
  // Todos os meses da janela, do mais antigo ao mais recente, inclusive os
  // zerados — um buraco faria o gráfico de linha mentir sobre a inclinação.
  by_month: z.array(monthSchema),
});

// `.catch()` porque a janela vem da URL e é editável por quem usa: um valor
// inválido cai no padrão em vez de pôr a tela inteira em erro.
export const refundSummarySearchParamsSchema = z.object({
  months: z.coerce.number().int().min(1).max(12).catch(6),
});

export type RefundSummary = z.output<typeof refundSummaryResponseSchema>;
export type RefundSummaryMonth = z.output<typeof monthSchema>;
export type RefundSummaryBucket = z.output<typeof bucketSchema>;
export type RefundCategoryTotals = z.output<typeof byCategorySchema>;
