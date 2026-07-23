import { z } from "zod";

export const loginResponseSchema = z.object({
  access: z.literal(true),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["standard", "admin"]),
  token: z.string().min(1),
});

export type LoginResponse = z.output<typeof loginResponseSchema>;
