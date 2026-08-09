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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const { mutateAsync, isPending } = usePayRefund();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Clears the error the instant `open` flips to true, during render rather
  // than in an effect: this dialog has no internal trigger (its parent,
  // PageRefundReview, flips `open` straight to true from ReviewDecision's
  // t("payment.markAsPaid") button), so Radix never calls `onOpenChange(true)` —
  // only its own close gestures do, always with `false` (see
  // handleOpenChange below, which is where CLOSE is handled). Tracking the
  // previous `open` in state and comparing during render is React's
  // documented way to react to a prop change without the extra render + effect
  // a useEffect would cost here (react.dev: "Adjusting state when a prop
  // changes").
  //
  // This closes a race the close-only clear cannot: closing while the
  // payment request is still in flight clears `submitError` via
  // handleOpenChange, but if that request then fails, the `catch` in
  // `onSubmit` sets it *after* the close already ran — leaving a stale error
  // from an abandoned attempt that would otherwise still be sitting there the
  // next time this dialog opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSubmitError(null);
  }

  // Same reason as RefundFormDialog: without this the untouched file field
  // reaches Zod as undefined and fails the type check, whose message is the
  // library's English default rather than one of our keys.
  const form = useForm<PayRefundFormInput, unknown, PayRefundFormData>({
    resolver: zodResolver(payRefundSchema),
    defaultValues: { file: undefined },
  });

  async function onSubmit(data: PayRefundFormData) {
    setSubmitError(null);
    try {
      await mutateAsync({ id: refundId, file: data.file });
      handleOpenChange(false);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  }

  // Mirrors RefundFormDialog's handleOpenChange: this dialog is mounted
  // unconditionally (PageRefundReview never unmounts it), so without this its
  // state survives close/reopen. Reset on CLOSE so a reopened dialog doesn't
  // show the previously chosen file or a stale error banner from an
  // abandoned or failed attempt.
  //
  // The close itself stays unconditional on purpose: there is no HTTP
  // timeout or AbortController in this app, so gating close on `isPending`
  // risks a modal the user can never dismiss, and it wouldn't stop the
  // mutation anyway.
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
      setSubmitError(null);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("payment.markAsPaid")}</DialogTitle>
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
                      label={t("payment.receipt")}
                      accept=".jpg,.jpeg,.png,.pdf"
                      {...form.register("file")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError && (
              <p role="alert" className="animate-in fade-in-0 duration-150 text-sm text-destructive">
                {submitError}
              </p>
            )}

            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {isPending ? t("payment.marking") : t("payment.confirm")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
