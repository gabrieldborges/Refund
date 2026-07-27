import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
} from "@/components/molecules/Dialog";
import DialogContent from "@/components/molecules/Dialog";
import Text from "@/components/atoms/Text";
import InputText from "@/components/molecules/InputText";
import InputFile from "@/components/molecules/InputFile";
import PopOverMenu from "@/components/molecules/PopOverMenu";
import Button from "@/components/molecules/Button";
import { CATEGORY_OPTIONS } from "../constants/categories";
import {
  refundCreateSchema,
  type RefundCreateFormData,
  type RefundCreateFormInput,
} from "../schemas/refund";
import { useCreateRefund } from "../hooks/useCreateRefund";
import { getApiErrorMessage } from "@/lib/api";

interface RefundFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RefundFormDialog({ open, onOpenChange }: RefundFormDialogProps) {
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useCreateRefund();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RefundCreateFormInput, unknown, RefundCreateFormData>({
    resolver: zodResolver(refundCreateSchema),
  });

  async function onSubmit(data: RefundCreateFormData) {
    setSubmitError(null);
    try {
      await mutateAsync(data);
      reset();
      onOpenChange(false);
      navigate("/success");
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <DialogTitle asChild>
              <Text as="h2" variant="heading-medium">
                Nova solicitação de reembolso
              </Text>
            </DialogTitle>
            <DialogDescription asChild>
              <Text variant="paragraph-medium" className="text-muted">
                Dados da despesa para solicitar reembolso.
              </Text>
            </DialogDescription>
          </div>

          <InputText
            label="Nome da solicitação"
            placeholder="Nome"
            error={errors.name?.message}
            {...register("name")}
          />

          <div className="flex gap-4">
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <PopOverMenu
                  options={CATEGORY_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.category?.message}
                />
              )}
            />
            <InputText
              label="Valor"
              type="number"
              step="0.01"
              placeholder="0,00"
              error={errors.amount?.message}
              {...register("amount")}
            />
          </div>

          <InputFile
            accept=".jpg,.jpeg,.png,.pdf"
            error={errors.file?.message as string | undefined}
            {...register("file")}
          />

          {submitError && (
            <Text variant="paragraph-medium" className="text-error">
              {submitError}
            </Text>
          )}

          <Button type="submit" variant="primary" handling={isPending} disabled={isPending}>
            Enviar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
