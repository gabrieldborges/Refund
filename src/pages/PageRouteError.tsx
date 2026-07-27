import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { Button } from "@/components/ui/button";

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return "Não foi possível encontrar o conteúdo solicitado.";
    }

    if (error.status === 400) {
      return "O endereço informado não é válido.";
    }
  }

  return "Não foi possível carregar esta página. Tente novamente.";
}

export default function PageRouteError() {
  const error = useRouteError();

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center text-card-foreground">
        <h1 className="text-2xl font-semibold tracking-tight">Algo deu errado</h1>
        <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        <Button asChild variant="outline">
          <Link to="/">Voltar para solicitações</Link>
        </Button>
      </div>
    </main>
  );
}
