import { redirect, type LoaderFunctionArgs } from "react-router";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "./lib/api";
import { queryClient } from "./lib/query-client";
import { storedUserSchema } from "@/schemas/auth";
import {
  REFUNDS_PER_PAGE,
  refundDetailQuery,
  refundListQuery,
  refundListSearchParamsSchema,
} from "@/features/refunds";

// Devolve a sessão salva já validada por storedUserSchema, ou null se não
// houver usuário salvo ou o valor salvo não bater com o schema (JSON
// inválido, ou um formato antigo que não tem mais os campos exigidos).
function readStoredUser() {
  const user = localStorage.getItem(USER_STORAGE_KEY);
  if (!user) return null;

  let parsedUser: unknown;
  try {
    parsedUser = JSON.parse(user);
  } catch {
    parsedUser = undefined;
  }

  const result = storedUserSchema.safeParse(parsedUser);
  return result.success ? result.data : null;
}

function requireSession() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (!token) {
    throw redirect("/login");
  }

  // AuthContext já valida o usuário salvo com storedUserSchema; este loader
  // rodava antes com uma checagem de presença só, então uma sessão que não
  // passa mais no schema (ex.: salva antes do `id` existir) chegava a disparar
  // um ensureQueryData autenticado antes do ProtectedRoute perceber que
  // isAuthenticated é false. Validar aqui fecha essa janela e, ao falhar,
  // apaga token e usuário — um "redirect pro login" que deixasse as
  // credenciais no localStorage não seria de fato um logout.
  if (!readStoredUser()) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    throw redirect("/login");
  }
}

export async function homeLoader({ request }: LoaderFunctionArgs) {
  requireSession();

  const url = new URL(request.url);
  const { page, name } = refundListSearchParamsSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    name: url.searchParams.get("name") ?? undefined,
  });
  const normalizedSearchParams = new URLSearchParams(url.searchParams);

  if (page > 1) {
    normalizedSearchParams.set("page", String(page));
  } else {
    normalizedSearchParams.delete("page");
  }

  if (name) {
    normalizedSearchParams.set("name", name);
  } else {
    normalizedSearchParams.delete("name");
  }

  if (normalizedSearchParams.toString() !== url.searchParams.toString()) {
    const normalizedSearch = normalizedSearchParams.toString();
    throw redirect(`${url.pathname}${normalizedSearch ? `?${normalizedSearch}` : ""}`);
  }

  const queryParams = { page, perPage: REFUNDS_PER_PAGE, name };

  await queryClient.ensureQueryData(refundListQuery(queryParams));

  return queryParams;
}

export async function refundDetailLoader({ params }: LoaderFunctionArgs) {
  requireSession();

  if (!params.id) {
    throw new Response("Refund ID is required", { status: 400 });
  }

  await queryClient.ensureQueryData(refundDetailQuery(params.id));

  return { id: params.id };
}

export async function reviewLoader({ params }: LoaderFunctionArgs) {
  requireSession();

  if (!params.id) {
    throw new Response("Refund ID is required", { status: 400 });
  }

  const refund = await queryClient.ensureQueryData(refundDetailQuery(params.id));
  const session = readStoredUser();

  // Guarda de UI, não de segurança: quem de fato protege os dados é a API,
  // respondendo 403/404 se alguém tentar revisar sem permissão. Este loader
  // só evita OFERECER uma ação que seria recusada — ele decide antes de
  // qualquer render, mas a decisão real não está aqui. Uma rota "protegida"
  // só no cliente, sem o correspondente no backend, protegeria a interface e
  // vazaria os dados.
  if (session?.role !== "admin" || refund.user.id === session.id) {
    throw redirect(`/refunds/${params.id}`);
  }

  return { id: params.id };
}
