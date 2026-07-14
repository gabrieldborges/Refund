import { z } from "zod";
import { CATEGORY_VALUES } from "../constants/categories";

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

export const refundCreateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.enum(CATEGORY_VALUES, { message: "Selecione uma categoria" }),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  file: z
    .instanceof(FileList)
    .refine((files) => files.length > 0, "Anexe o comprovante")
    .refine(
      (files) => !files[0] || files[0].size <= MAX_FILE_SIZE_BYTES,
      "Arquivo deve ter no máximo 4MB"
    )
    .refine(
      (files) =>
        !files[0] || ALLOWED_EXTENSIONS.some((ext) => files[0].name.toLowerCase().endsWith(ext)),
      "Arquivo deve ser JPG, PNG ou PDF"
    ),
});

// Saída (depois de validar/coagir — amount já é number): o que o onSubmit recebe.
export type RefundCreateFormData = z.output<typeof refundCreateSchema>;
// Entrada (o que o campo do formulário realmente digita — amount ainda cru):
// é esse tipo que o useForm precisa pra tipar os campos antes da validação.
export type RefundCreateFormInput = z.input<typeof refundCreateSchema>;
