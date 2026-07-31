import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api";
import type { RefundStatus } from "../schemas/refund";
import { useReviewRefund } from "../hooks/useReviewRefund";

// Validação só do diálogo de rejeição: a API responde 422 sem `reason`, então
// o formulário nunca deixa a mutation disparar com o campo vazio.
const rejectSchema = z.object({
  reason: z.string().trim().min(1, "Motivo é obrigatório"),
});
type RejectFormData = z.infer<typeof rejectSchema>;

interface ReviewDecisionProps {
  refundId: string;
  status: RefundStatus;
  // A Task 6 constrói o que este botão abre; aqui ele só existe e é conectado.
  onMarkAsPaid: () => void;
}

// O botão do status VIGENTE nunca é renderizado — não desabilitado. A API
// responde 422 ao tentar mover um reembolso para o status que ele já tem
// (UC-007), e não oferecer esse botão torna o erro impossível de disparar
// pela UI. `paid` é terminal: nenhum botão de decisão é mostrado.
export default function ReviewDecision({ refundId, status, onMarkAsPaid }: ReviewDecisionProps) {
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutateAsync, isPending } = useReviewRefund();

  // Which action is in flight. `isPending` alone can't say which button was
  // clicked, and without this both buttons would show a spinner at once.
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);

  const form = useForm<RejectFormData>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: "" },
  });

  async function handleApprove() {
    setSubmitError(null);
    setPendingAction("approve");
    try {
      await mutateAsync({ id: refundId, status: "approved" });
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleReject(data: RejectFormData) {
    setSubmitError(null);
    setPendingAction("reject");
    try {
      await mutateAsync({ id: refundId, status: "rejected", reason: data.reason });
      setIsRejectOpen(false);
      form.reset();
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    } finally {
      setPendingAction(null);
    }
  }

  if (status === "paid") {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {status === "pending" && (
          <Button
            onClick={handleApprove}
            disabled={isPending}
            aria-busy={pendingAction === "approve"}
            className="flex-1"
          >
            {pendingAction === "approve" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {pendingAction === "approve" ? "Aprovando…" : "Aprovar"}
          </Button>
        )}

        {status === "rejected" && (
          <Button
            onClick={handleApprove}
            disabled={isPending}
            aria-busy={pendingAction === "approve"}
            className="w-full"
          >
            {pendingAction === "approve" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {pendingAction === "approve" ? "Aprovando…" : "Aprovar"}
          </Button>
        )}

        {(status === "pending" || status === "approved") && (
          <Button
            variant="destructive"
            onClick={() => setIsRejectOpen(true)}
            disabled={isPending}
            className="flex-1"
          >
            Rejeitar
          </Button>
        )}

        {status === "approved" && (
          <Button variant="outline" onClick={onMarkAsPaid} disabled={isPending} className="flex-1">
            Marcar como pago
          </Button>
        )}
      </div>

      {submitError && (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      )}

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar solicitação</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. Ele fica registrado no histórico da solicitação.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleReject)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva o motivo da rejeição" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsRejectOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isPending}
                  aria-busy={pendingAction === "reject"}
                >
                  {pendingAction === "reject" && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  {pendingAction === "reject" ? "Rejeitando…" : "Confirmar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
