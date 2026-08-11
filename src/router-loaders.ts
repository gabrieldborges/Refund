import { redirect, type LoaderFunctionArgs } from "react-router";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "./lib/api";
import { queryClient } from "./lib/query-client";
import { storedUserSchema } from "@/schemas/auth";
import {
  REFUNDS_PER_PAGE,
  refundDetailQuery,
  refundListQuery,
  refundListSearchParamsSchema,
  refundSummaryQuery,
  refundSummarySearchParamsSchema,
} from "@/features/refunds";
import {
  USERS_PER_PAGE,
  userDetailQuery,
  userListQuery,
  userListSearchParamsSchema,
} from "@/features/team";

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

// Guarda de papel para as rotas do diretório (BR-025). Guarda de UI, não de
// segurança — a mesma ressalva do reviewLoader: quem protege os dados é a API,
// respondendo 403 na listagem e 404 na consulta. Isto só evita OFERECER uma
// página que seria recusada.
//
// NÃO serve para o reviewLoader, e a diferença não é estilo: ali o destino do
// redirecionamento é o detalhe da solicitação, e a condição inclui a regra de o
// admin não revisar a própria (BR-016). Unificar as duas trocaria o destino de
// uma delas em silêncio.
function requireAdmin() {
  if (readStoredUser()?.role !== "admin") {
    throw redirect("/");
  }
}

// Escreve o parâmetro só quando ele carrega informação: ausente, vazio ou
// igual ao padrão sai da URL. É a regra que o Item 3 estabeleceu para `page`
// e `name`, agora com um lugar só em vez de um `if` por parâmetro.
function setOrDelete(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
  defaultValue?: string
) {
  if (value && value !== defaultValue) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
}

export async function homeLoader({ request }: LoaderFunctionArgs) {
  requireSession();

  const url = new URL(request.url);
  const { page, name, status, sort, order } = refundListSearchParamsSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    name: url.searchParams.get("name") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    order: url.searchParams.get("order") ?? undefined,
  });

  const normalizedSearchParams = new URLSearchParams(url.searchParams);
  setOrDelete(normalizedSearchParams, "page", page > 1 ? String(page) : undefined);
  setOrDelete(normalizedSearchParams, "name", name);
  setOrDelete(normalizedSearchParams, "status", status);
  setOrDelete(normalizedSearchParams, "sort", sort, "created_at");
  setOrDelete(normalizedSearchParams, "order", order, "desc");

  if (normalizedSearchParams.toString() !== url.searchParams.toString()) {
    const normalizedSearch = normalizedSearchParams.toString();
    throw redirect(`${url.pathname}${normalizedSearch ? `?${normalizedSearch}` : ""}`);
  }

  const queryParams = { page, perPage: REFUNDS_PER_PAGE, name, status, sort, order };

  await queryClient.ensureQueryData(refundListQuery(queryParams));

  return queryParams;
}

export async function teamLoader({ request }: LoaderFunctionArgs) {
  requireSession();
  requireAdmin();

  const url = new URL(request.url);
  const { page, name } = userListSearchParamsSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    name: url.searchParams.get("name") ?? undefined,
  });

  const normalizedSearchParams = new URLSearchParams(url.searchParams);
  setOrDelete(normalizedSearchParams, "page", page > 1 ? String(page) : undefined);
  setOrDelete(normalizedSearchParams, "name", name);

  if (normalizedSearchParams.toString() !== url.searchParams.toString()) {
    const normalizedSearch = normalizedSearchParams.toString();
    throw redirect(`${url.pathname}${normalizedSearch ? `?${normalizedSearch}` : ""}`);
  }

  const queryParams = { page, perPage: USERS_PER_PAGE, name };

  await queryClient.ensureQueryData(userListQuery(queryParams));

  return queryParams;
}

export async function teamMemberLoader({ params }: LoaderFunctionArgs) {
  requireSession();
  requireAdmin();

  if (!params.id) {
    throw new Response("User ID is required", { status: 400 });
  }

  await queryClient.ensureQueryData(userDetailQuery(params.id));

  return { id: params.id };
}

export async function dashboardLoader({ request }: LoaderFunctionArgs) {
  requireSession();
  // SEM requireAdmin: a tela é para todos. O escopo dos dados é decidido no
  // servidor a partir do papel no token (UC-017), então um usuário padrão vê o
  // mesmo Dashboard com os próprios números.

  const url = new URL(request.url);
  const { months } = refundSummarySearchParamsSchema.parse({
    months: url.searchParams.get("months") ?? undefined,
  });

  const normalizedSearchParams = new URLSearchParams(url.searchParams);
  setOrDelete(normalizedSearchParams, "months", months !== 6 ? String(months) : undefined);

  if (normalizedSearchParams.toString() !== url.searchParams.toString()) {
    const normalizedSearch = normalizedSearchParams.toString();
    throw redirect(`${url.pathname}${normalizedSearch ? `?${normalizedSearch}` : ""}`);
  }

  await queryClient.ensureQueryData(refundSummaryQuery(months));

  return { months };
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
