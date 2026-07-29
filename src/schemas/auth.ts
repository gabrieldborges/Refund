import { z } from "zod";

const roleSchema = z.enum(["standard", "admin"]);

export const loginResponseSchema = z.object({
  access: z.literal(true),
  id: z.number().int().positive(),
  name: z.string(),
  email: z.string().email(),
  role: roleSchema,
  token: z.string().min(1),
});

// A sessão gravada no localStorage também é uma fronteira: até aqui ela era
// lida com type assertion, que não valida nada. O Item 2 cobriu só respostas
// HTTP; esta é a metade que faltava.
export const storedUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  email: z.string().email(),
  role: roleSchema,
});

export type LoginResponse = z.output<typeof loginResponseSchema>;
