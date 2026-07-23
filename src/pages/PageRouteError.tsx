import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import Text from "../components/atoms/Text";

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
    <main className="w-full min-h-screen bg-gray-500 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md bg-white rounded-lg p-8 flex flex-col items-center gap-4 text-center">
        <Text as="h1" variant="heading-medium">
          Algo deu errado
        </Text>
        <Text variant="paragraph-medium" className="text-gray-200">
          {getErrorMessage(error)}
        </Text>
        <Link to="/" className="text-green-100 font-semibold">
          Voltar para solicitações
        </Link>
      </div>
    </main>
  );
}
