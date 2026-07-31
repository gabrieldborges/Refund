import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import InputFile from "@/components/ui/input-file";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api";
import { payRefundSchema, type PayRefundFormData, type PayRefundFormInput } from "../schemas/refund";
import { usePayRefund } from "../hooks/usePayRefund";

interface PayRefundDialogProps {
  refundId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The file is mandatory (UC-012, BR-022): the API refuses to move a refund to
// `paid` without a payment receipt, because `status === "paid"` is itself the
// proof that money moved. This dialog has no way to submit without a file —
// payRefundSchema's first refinement rejects an empty FileList before the
// mutation ever fires.
export default function PayRefundDialog({ refundId, open, onOpenChange }: PayRefundDialogProps) {
  const { mutateAsync, isPending } = usePayRefund();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<PayRefundFormInput, unknown, PayRefundFormData>({
    resolver: zodResolver(payRefundSchema),
  });

  async function onSubmit(data: PayRefundFormData) {
    setSubmitError(null);
    try {
      await mutateAsync({ id: refundId, file: data.file });
      form.reset();
      onOpenChange(false);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  }

  // Ignore close attempts (the header's X, outside click, Escape) while the
  // upload is in flight — same reasoning as disabling the other decision
  // buttons in ReviewDecision: the user should not be able to walk away from
  // a mutation that is still running.
  function handleOpenChange(next: boolean) {
    if (isPending) return;
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Marcar como pago</DialogTitle>
          <DialogDescription>
            Anexe o comprovante de pagamento para concluir a solicitação.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="file"
              render={() => (
                <FormItem>
                  <FormControl>
                    <InputFile
                      label="Comprovante de pagamento"
                      accept=".jpg,.jpeg,.png,.pdf"
                      {...form.register("file")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError && (
              <p role="alert" className="text-sm text-destructive">
                {submitError}
              </p>
            )}

            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {isPending ? "Marcando como pago…" : "Confirmar pagamento"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
