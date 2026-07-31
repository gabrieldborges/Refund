import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useNavigation } from "react-router";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import InputFile from "@/components/ui/input-file";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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

  // `isPending` covers only the create request; it falls the instant
  // `mutateAsync` resolves. But `navigate("/success")` below then starts a
  // router transition, and during it this dialog (and this button) is still
  // what's on screen. The router's own navigation state is what closes that
  // gap.
  const navigation = useNavigation();
  const isBusy = isPending || navigation.state !== "idle";

  const form = useForm<RefundCreateFormInput, unknown, RefundCreateFormData>({
    resolver: zodResolver(refundCreateSchema),
  });

  async function onSubmit(data: RefundCreateFormData) {
    setSubmitError(null);
    try {
      await mutateAsync(data);
      handleOpenChange(false);
      navigate("/success");
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  }

  // Reset on CLOSE, not only on submit: someone who fills the form, changes
  // their mind, and reopens it should not find their old draft — or the
  // error banner from whatever attempt they abandoned. This also covers the
  // success path above, since it closes by calling this function instead of
  // the raw `onOpenChange` prop directly.
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
          <DialogTitle>Nova solicitação de reembolso</DialogTitle>
          <DialogDescription>Dados da despesa para solicitar reembolso.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da solicitação</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="flex-1 ">
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full ">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      {/* `amount` is `z.coerce.number()`, whose zod-v4 input type is
                          `unknown` (it accepts anything pre-coercion) — react-hook-form
                          types `field.value` from that, but the native input only
                          accepts string | number | undefined as a value. The cast is
                          safe: this field always holds what the user typed, a string,
                          until submit coerces it. */}
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        {...field}
                        value={field.value as string | number | undefined}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="file"
              render={() => (
                <FormItem >
                  <FormControl >
                    <InputFile accept=".jpg,.jpeg,.png,.pdf" {...form.register("file")} />
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

            <Button type="submit" disabled={isBusy} aria-busy={isBusy}>
              {isBusy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {isBusy ? "Enviando…" : "Enviar"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
