import { Component, type ErrorInfo, type ReactNode } from "react";
import i18next from "i18next";
import { Button } from "@/components/ui/button";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

// The last line of defence against a blank page.
//
// This has to be a class: `getDerivedStateFromError` and `componentDidCatch`
// have no hook equivalent, so a function component cannot be an error
// boundary. It is the only class in the project, and that is why.
//
// It sits ABOVE RouterProvider (see main.tsx), covering the render of every
// provider — the one region react-router's own ErrorBoundary cannot reach.
// Being outside the router also constrains the fallback: no <Link>, no
// navigate, because there is no router to navigate with. Reloading the
// document is the only recovery available from here.
//
// It does NOT catch errors from event handlers, timers or async code; React
// error boundaries only cover render, layout effects and constructors.
export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  // Runs during the render phase and may not cause side effects: its only job
  // is to flip state so the next render shows the fallback.
  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  // Runs in the commit phase, where side effects are allowed. This is the seam
  // where structured logging goes once Item 24 (observability) exists; until
  // then the console keeps the stack reachable instead of swallowing it.
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // i18next.t is called directly rather than through useTranslation: this is
    // a class, and hooks are not available. That also means the fallback does
    // not re-render on a language switch — acceptable, because the only action
    // it offers is reloading the document, which reinitialises everything.
    //
    // Every key carries a defaultValue. One of the failures this boundary
    // exists to survive is the catalogue itself failing to load (see the
    // .catch in main.tsx), and a safety net that renders "error.title" when
    // the app is already broken helps nobody.
    const t = i18next.t.bind(i18next);

    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center text-card-foreground">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("error.title", { defaultValue: "Algo deu errado" })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("error.bootFailed", {
              defaultValue:
                "A aplicação não conseguiu iniciar. Recarregue a página para tentar de novo.",
            })}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t("error.reload", { defaultValue: "Recarregar a página" })}
          </Button>
        </div>
      </main>
    );
  }
}
