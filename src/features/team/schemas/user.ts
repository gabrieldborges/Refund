import { z } from "zod";

// Espelha os dois papéis que a coluna users.role de fato guarda. Um terceiro
// valor tem de falhar aqui, na fronteira, em vez de virar um badge desconhecido
// no meio da tabela.
export const userRoleSchema = z.enum(["standard", "admin"]);

export const userSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  email: z.string(),
  role: userRoleSchema,
  // Booleano derivado de avatar_filename no servidor: o cliente só precisa
  // saber se mostra foto ou iniciais, e busca a imagem em
  // GET /users/{id}/avatar (UC-011).
  has_avatar: z.boolean(),
  // Nullable pelo mesmo motivo de refund.created_at: a coluna tem default no
  // servidor, mas a forma da resposta não promete que veio.
  created_at: z.string().nullable(),
});

export const userResponseSchema = z.object({
  type: z.literal("User"),
  count: z.number().int().nonnegative(),
  attributes: userSchema,
});

export const userListResponseSchema = z.object({
  type: z.literal("User"),
  count: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  per_page: z.number().int().min(1).max(100),
  // nonnegative e não positive: a API responde 0 quando não há ninguém, porque
  // "nenhuma página" não é a mesma afirmação que "uma página vazia" (UC-015).
  total_pages: z.number().int().nonnegative(),
  attributes: z.array(userSchema),
});

// `.catch()` por campo: a URL é editável por quem usa, então um valor inválido
// cai no padrão em vez de pôr a página inteira em isError. Um 422 por um
// parâmetro digitado errado seria a tela de Time toda em erro.
export const userListSearchParamsSchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  name: z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .optional(),
});

export type TeamUser = z.output<typeof userSchema>;
export type UserRole = z.output<typeof userRoleSchema>;
export type UserListResponse = z.output<typeof userListResponseSchema>;
export type UserListSearchParams = z.output<typeof userListSearchParamsSchema>;
