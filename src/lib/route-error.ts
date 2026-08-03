import { isRouteErrorResponse } from "react-router";

// Shared by the two route-level error UIs: the full-page PageRouteError and
// the compact ContentError rendered inside the app shell. Extracted only once
// the second consumer appeared, not in anticipation of it.
export function getRouteErrorMessage(error: unknown): string {
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
