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
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Algo deu errado</h1>
      <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
      <Button asChild variant="outline">
        <Link to="/">Voltar para solicitações</Link>
      </Button>
    </div>
  );
}
