import { Link, useRevalidator, useRouteError } from "react-router";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getRouteErrorMessageKey } from "@/lib/route-error";

export default function PageRouteError() {
  const { t } = useTranslation();
  const error = useRouteError();
  // Re-runs the loaders for the current match instead of navigating away. The
  // link below was the only affordance before, and it is a dead end when the
  // route that failed IS "/" — it points at the page that just broke.
  const revalidator = useRevalidator();
  const isRetrying = revalidator.state === "loading";

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center text-card-foreground">
        <h1 className="text-2xl font-semibold tracking-tight">{t("error.title")}</h1>
        <p className="text-sm text-muted-foreground">{t(getRouteErrorMessageKey(error))}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => revalidator.revalidate()} disabled={isRetrying} aria-busy={isRetrying}>
            {isRetrying && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {isRetrying ? t("error.retrying") : t("error.retry")}
          </Button>
          <Button asChild variant="outline">
            <Link to="/">{t("error.backToRefunds")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
