import { z } from "zod";

const daySchema = z.object({
  // "YYYY-MM-DD". String simples: o cliente usa como chave e como rótulo, e a
  // aritmética de data fica com o componente de calendário.
  date: z.string(),
  count: z.number().int().nonnegative(),
});

export const refundDailyCountsResponseSchema = z.object({
  type: z.literal("RefundDailyCounts"),
  scope: z.enum(["all", "user"]),
  month: z.string(),
  // Todos os dias do mês, inclusive os zerados. O servidor preenche porque quantos
  // dias um mês tem é conhecimento de calendário, e fevereiro é onde tirar isso dos
  // dados dá errado.
  days: z.array(daySchema),
});

// `.catch(undefined)` e não um mês literal: um literal envelheceria no código, e o
// servidor já sabe que mês é hoje. Mesma escolha do `year` do resumo.
export const calendarSearchParamsSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .catch(undefined),
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
});

export type RefundDailyCounts = z.output<typeof refundDailyCountsResponseSchema>;
export type RefundDayCount = z.output<typeof daySchema>;
