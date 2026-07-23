import { redirect, type LoaderFunctionArgs } from "react-router";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "./lib/api";
import { queryClient } from "./lib/query-client";
import { refundDetailQuery, refundListQuery } from "./hooks/refundQueries";
import { refundListSearchParamsSchema } from "./schemas/refund";

const REFUNDS_PER_PAGE = 6;

function requireSession() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const user = localStorage.getItem(USER_STORAGE_KEY);

  if (!token || !user) {
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
