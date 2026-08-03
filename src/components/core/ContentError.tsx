import { useRevalidator, useRouteError } from "react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRouteErrorMessage } from "@/lib/route-error";

// Route-level error UI for the pages rendered inside MainLayout.
//
// react-router renders an ErrorBoundary IN PLACE OF the element of the route
// that failed, so this is wired to a pathless route BELOW MainLayout (see
// router.tsx) rather than to MainLayout itself — otherwise the shell would be
// replaced along with the page, which is the very problem this fixes.
//
// Deliberately compact: no min-h-screen and no <main>, because SidebarInset
// already renders the page's single <main> landmark. Navigation lives in the
// surrounding sidebar, so retry is the only action offered here.
export default function ContentError() {
  const error = useRouteError();
  const revalidator = useRevalidator();
  const isRetrying = revalidator.state === "loading";

  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold tracking-tight">Algo deu errado</h2>
      <p className="text-sm text-muted-foreground">{getRouteErrorMessage(error)}</p>
      <Button onClick={() => revalidator.revalidate()} disabled={isRetrying} aria-busy={isRetrying}>
        {isRetrying && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {isRetrying ? "Tentando…" : "Tentar novamente"}
      </Button>
    </div>
  );
}
