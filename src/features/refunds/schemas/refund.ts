import { z } from "zod";
import { CATEGORY_VALUES } from "../constants/categories";
import { RECEIPT_ALLOWED_EXTENSIONS, RECEIPT_MAX_FILE_SIZE_BYTES } from "../constants/receiptFile";

// Every rule below carries a translation key, INCLUDING the type-level check,
// and that second part is the fix for a bug found in the browser: a field the
// user never touched arrives as `undefined`, Zod fails on TYPE before reaching
// .min()/.positive(), and the type-level message is the library's English
// default — never a key, so untranslatable by construction. Four of them showed
// at once on an empty submit, in a Portuguese UI.
//
// The dialog also sets defaultValues now, which is the other half: with "" the
// value-level rules are the ones that fire. Both halves are needed — a user can
// still clear a field back to undefined-ish states the defaults do not cover.
export const refundCreateSchema = z.object({
  name: z.string("validation.nameRequired").min(1, "validation.nameRequired"),
  category: z.enum(CATEGORY_VALUES, { message: "validation.categoryRequired" }),
  amount: z.coerce
    .number("validation.amountPositive")
    .positive("validation.amountPositive"),
  file: z
    .instanceof(FileList, { message: "validation.receiptRequired" })
    .refine((files) => files.length > 0, "validation.receiptRequired")
    .refine(
      (files) => !files[0] || files[0].size <= RECEIPT_MAX_FILE_SIZE_BYTES,
      "validation.fileTooLarge"
    )
    .refine(
      (files) =>
        !files[0] ||
        RECEIPT_ALLOWED_EXTENSIONS.some((ext) => files[0].name.toLowerCase().endsWith(ext)),
      "validation.fileType"
    ),
});

// Same rules as refundCreateSchema.shape.file (UC-012 mirrors BR-009), kept as
// its own schema rather than reused: the expense receipt and the payment
// receipt are unrelated forms, and merging them would mean a future change to
// one silently reaching the other.
export const payRefundSchema = z.object({
  file: z
    .instanceof(FileList, { message: "validation.paymentReceiptRequired" })
    .refine((files) => files.length > 0, "validation.paymentReceiptRequired")
    .refine(
      (files) => !files[0] || files[0].size <= RECEIPT_MAX_FILE_SIZE_BYTES,
      "validation.fileTooLarge"
    )
    .refine(
      (files) =>
        !files[0] ||
        RECEIPT_ALLOWED_EXTENSIONS.some((ext) => files[0].name.toLowerCase().endsWith(ext)),
      "validation.fileType"
    ),
});

const refundUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  // O cliente só precisa saber se mostra foto ou o gradiente padrão; a imagem
  // vem de GET /users/{id}/avatar, não deste campo.
  has_avatar: z.boolean(),
});

export const refundStatusSchema = z.enum(["pending", "approved", "rejected", "paid"]);

// Espelham as listas brancas de UC-004. Um valor fora delas responde 422 no
// servidor, então o cliente cai no padrão em vez de propagar o erro.
export const refundSortSchema = z.enum(["created_at", "amount_in_cents", "name", "status"]);
export const refundOrderSchema = z.enum(["asc", "desc"]);

export const refundSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  category: z.enum(CATEGORY_VALUES),
  amount_in_cents: z.number().int().positive(),
  status: refundStatusSchema,
  created_at: z.string().nullable(),
  user: refundUserSchema,
});

export const refundsListResponseSchema = z.object({
  type: z.literal("Refund"),
  count: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  sum_amount_in_cents: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  per_page: z.number().int().min(1).max(100),
  total_pages: z.number().int().nonnegative(),
  attributes: z.array(refundSchema),
});

// Um envelope só para detalhe E criação. Até este ciclo a criação tinha
// contrato próprio, porque a API não devolvia `created_at`; ela passou a reler
// a linha gravada e as três respostas ficaram idênticas. Quando o backend
// remove uma divergência, o frontend remove a compensação.
export const refundResponseSchema = z.object({
  type: z.literal("Refund"),
  count: z.literal(1),
  attributes: refundSchema,
});

export const refundListSearchParamsSchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  name: z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .optional(),
  // Ausente = todos os status. `.optional()` antes de `.catch()` para que
  // ausência passe pela validação e só um valor INVÁLIDO caia no catch.
  status: refundStatusSchema.optional().catch(undefined),
  sort: refundSortSchema.catch("created_at"),
  order: refundOrderSchema.catch("desc"),
});

// A decisão registrada no histórico. `reason` é nullable porque só a rejeição
// exige justificativa (BR-018) — aprovação e pagamento gravam null.
export const refundReviewSchema = z.object({
  from_status: refundStatusSchema,
  to_status: refundStatusSchema,
  reason: z.string().nullable(),
  reviewer: z.object({ id: z.number().int().positive(), name: z.string().min(1) }),
  created_at: z.string(),
});

export const refundReviewsResponseSchema = z.object({
  type: z.literal("RefundReview"),
  count: z.number().int().nonnegative(),
  attributes: z.array(refundReviewSchema),
});

const statusTotalsSchema = z.object({
  count: z.number().int().nonnegative(),
  amount_in_cents: z.number().int().nonnegative(),
});

// Sem total geral, de propósito: somar os quatro status juntaria previsão,
// passivo, despesa liquidada e nada. Quem precisar de uma manchete soma as
// contagens no cliente.
export const refundStatsResponseSchema = z.object({
  type: z.literal("RefundStats"),
  user_id: z.number().int().positive(),
  by_status: z.object({
    pending: statusTotalsSchema,
    approved: statusTotalsSchema,
    paid: statusTotalsSchema,
    rejected: statusTotalsSchema,
  }),
});

// Saída (depois de validar/coagir — amount já é number): o que o onSubmit recebe.
export type RefundCreateFormData = z.output<typeof refundCreateSchema>;
// Entrada (o que o campo do formulário realmente digita — amount ainda cru):
// é esse tipo que o useForm precisa pra tipar os campos antes da validação.
export type RefundCreateFormInput = z.input<typeof refundCreateSchema>;
// Same in/out split as RefundCreateFormData/Input, for the pay-refund form.
export type PayRefundFormData = z.output<typeof payRefundSchema>;
export type PayRefundFormInput = z.input<typeof payRefundSchema>;
export type Refund = z.output<typeof refundSchema>;
export type RefundStatus = z.output<typeof refundStatusSchema>;
export type RefundSort = z.output<typeof refundSortSchema>;
export type RefundOrder = z.output<typeof refundOrderSchema>;
export type RefundsListResponse = z.output<typeof refundsListResponseSchema>;
export type RefundListSearchParams = z.output<typeof refundListSearchParamsSchema>;
export type RefundReview = z.output<typeof refundReviewSchema>;
export type RefundStats = z.output<typeof refundStatsResponseSchema>;

// Item 22: as rotas de arquivo deixaram de devolver bytes e passaram a
// devolver uma URL assinada de vida curta. O `media_type` vem junto porque o
// cliente escolhe entre <img> e <object> ANTES de buscar, e uma URL não
// carrega tipo.
//
// Ao contrário do que valia antes, aqui HÁ estrutura a validar — a resposta
// virou JSON. O comentário de `receiptQuery` que dizia "única query do projeto
// sem Zod, porque a resposta é binária" deixou de valer.
export const fileUrlResponseSchema = z.object({
  url: z.string().url(),
  media_type: z.string(),
});

export type FileUrlResponse = z.infer<typeof fileUrlResponseSchema>;
