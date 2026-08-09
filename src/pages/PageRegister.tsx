import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ReceiptIcon from "@/assets/icons/Receipt.svg?react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/context/useAuth";
import { getApiErrorMessage } from "@/lib/api";
import { useTranslation } from "react-i18next";

const registerFormSchema = z.object({
  name: z.string().min(1, "validation.nameRequired"),
  email: z
    .string("validation.emailRequired")
    .min(1, "validation.emailRequired")
    .email("validation.emailInvalid"),
  password: z.string().min(6, "validation.passwordMinLength"),
});

type RegisterFormData = z.output<typeof registerFormSchema>;

export default function PageRegister() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(data: RegisterFormData) {
    setSubmitError(null);
    try {
      await register(data.name, data.email, data.password);
      navigate("/login");
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <ReceiptIcon className="h-8 w-8 text-foreground" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">refund</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("auth.namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="voce@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.password")}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
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

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t("auth.signingUp") : t("auth.signUp")}
            </Button>
          </form>
        </Form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link to="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
