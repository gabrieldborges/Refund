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
import { useTranslation } from "react-i18next";

interface RefundFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RefundFormDialog({ open, onOpenChange }: RefundFormDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useCreateRefund();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Clears the error the instant `open` flips to true, during render rather
  // than in an effect: this dialog has no internal trigger (MainLayout flips
  // `open` straight to true from the Topbar button), so Radix never calls
  // `onOpenChange(true)` — only its own close gestures do, always with
  // `false` (see handleOpenChange below, which is where CLOSE is handled).
  // Tracking the previous `open` in state and comparing during render is
  // React's documented way to react to a prop change without the extra
  // render + effect a useEffect would cost here (react.dev: "Adjusting state
  // when a prop changes").
  //
  // This closes a race the close-only clear cannot: closing while the create
  // request is still in flight clears `submitError` via handleOpenChange,
  // but if that request then fails, the `catch` in `onSubmit` sets it
  // *after* the close already ran — leaving a stale error from an abandoned
  // attempt that would otherwise still be sitting there the next time this
  // dialog opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSubmitError(null);
  }

  // `isPending` covers only the create request; it falls the instant
  // `mutateAsync` resolves. But `navigate("/success")` below then starts a
  // router transition, and during it this dialog (and this button) is still
  // what's on screen. The router's own navigation state is what closes that
  // gap.
  const navigation = useNavigation();
  const isBusy = isPending || navigation.state !== "idle";

  // defaultValues is not cosmetic here. Without it react-hook-form hands Zod
  // `undefined` for every untouched field, which fails the TYPE check before
  // any of our messages are reached — see the note on refundCreateSchema.
  const form = useForm<RefundCreateFormInput, unknown, RefundCreateFormData>({
    resolver: zodResolver(refundCreateSchema),
    defaultValues: { name: "", category: undefined, amount: "", file: undefined },
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
          <DialogTitle>{t("refund.newTitle")}</DialogTitle>
          <DialogDescription>{t("refund.newDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("refund.nameLabel")}</FormLabel>
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
                    <FormLabel>{t("common.category")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full ">
                          <SelectValue placeholder={t("refund.selectPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {t(option.labelKey)}
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
                    <FormLabel>{t("common.amount")}</FormLabel>
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
              <p role="alert" className="animate-in fade-in-0 duration-150 text-sm text-destructive">
                {submitError}
              </p>
            )}

            {/* The button stays disabled for any in-flight navigation (`isBusy`,
                including one this dialog didn't start — see `isBusy` above), so a
                click can't race an unrelated transition. But the t("refund.submitting") label
                and spinner must track only `isPending`, the create mutation itself:
                this dialog is mounted on every protected route, so an unrelated
                navigation (e.g. typing in the Home search) could otherwise make it
                claim work is in flight when nothing is. */}
            <Button type="submit" disabled={isBusy} aria-busy={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {isPending ? t("refund.submitting") : t("refund.submit")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
