# Navegação da revisão e tabela de solicitações — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o Item 13 da trilha (TanStack Table na Home, com ordenação e filtro server-side) e as lacunas de ergonomia da tela de revisão: comprovante da despesa, contador Total, destaque da solicitação atual e duas navegações.

**Architecture:** Tudo no `Refund-FrontEnd`, sem mudança de backend — `status`, `sort`, `order` e `created_at` já existem em `GET /refunds`. Os parâmetros de listagem entram pela fronteira já usada desde o Item 3 (search params validados por Zod → loader → `queryOptions`), e a tabela consome esse estado em vez de manter o seu: `manualSorting`/`manualFiltering` ligados, ordenação vivendo na URL. A tela de revisão ganha componentes dentro da feature `refunds`, atrás da fachada.

**Tech Stack:** React 19, TypeScript, Vite, TanStack Query v5, **TanStack Table v8 (novo)**, React Router 7 (Data Mode), Zod 4, Tailwind 4, shadcn/ui, Vitest + Testing Library + MSW.

**Spec:** [`2026-07-31-review-navigation-and-refund-table-design.md`](../specs/2026-07-31-review-navigation-and-refund-table-design.md)

## Global Constraints

- **Nenhuma mudança no `Refund-api`.** Se uma task parecer exigir backend, pare e reporte.
- **Textos de UI em português; código, identificadores e comentários em inglês** (`AGENTS.md`).
- **Listas brancas do cliente espelham o servidor** (UC-004): `sort` ∈ `created_at | amount_in_cents | name | status`; `order` ∈ `asc | desc`; `status` ∈ `pending | approved | paid | rejected`.
- **Valor fora da lista branca cai no padrão**, nunca vira `422`.
- **Componentes de UI novos vêm do registry** (`npx shadcn@latest add <nome>`), em `src/components/ui`.
- **Depois do CLI do shadcn:** mover os arquivos de `./@/` para `src/components/ui`, apagar `./@` e conferir `git diff src/index.css` (o CLI acrescenta um bloco `.dark { … }`, seletor errado neste projeto).
- **Verificação por task:** `npx vitest run`, `npx tsc -b --noEmit`, `npm run lint` — os três limpos antes do commit. O ponto de partida é 157 testes / 38 arquivos, `tsc` exit 0, lint 0 erros 0 warnings.
- **Um commit por task**, mensagem descrevendo a responsabilidade.
- **Camadas** (`eslint-plugin-boundaries`): a feature `refunds` pode importar `ui`/`shared` e o próprio interior; nunca `@/context` nem `pages/`. O tipo do viewer é `RefundViewer` (`lib/getRefundHref.ts`), não `AuthUser`.
- **Nunca ordenar ou filtrar no cliente.** `manualSorting: true` e `manualFiltering: true` são obrigatórios; o cliente só tem 10 de N linhas.

---

### Task 1: Parâmetros de listagem na fronteira

Fundação das Tasks 5, 6 e 12. Sem UI nova.

**Files:**
- Modify: `src/features/refunds/schemas/refund.ts:85-92` (`refundListSearchParamsSchema`)
- Modify: `src/features/refunds/api/refundQueries.ts:4-16` (`RefundListParams`) e `:53-70` (`refundListQuery`)
- Modify: `src/router-loaders.ts:51-83` (`homeLoader`)
- Modify: `src/test/msw/handlers.ts:33` (dívida do `per_page` literal)
- Test: `src/features/refunds/schemas/refund.test.ts` (existente), `src/router-loaders.test.ts` (criar)

**Interfaces:**
- Produces: `RefundSort = "created_at" | "amount_in_cents" | "name" | "status"`, `RefundOrder = "asc" | "desc"`, ambos exportados de `schemas/refund.ts`.
- Produces: `refundListSearchParamsSchema` devolvendo `{ page, name?, status?, sort, order }` — `sort` e `order` **sempre presentes** (têm padrão); `status` opcional.
- Produces: `refundListQuery({ page, perPage, name?, userId?, status?, sort?, order? })`.
- Produces: `homeLoader` devolvendo `{ page, perPage, name, status, sort, order }`.

- [ ] **Step 1: Escrever os testes de schema que falham**

Em `src/features/refunds/schemas/refund.test.ts`, acrescentar:

```ts
describe("refundListSearchParamsSchema", () => {
  // An unknown sort must fall back to the default instead of reaching the API:
  // the server answers 422 for a sort outside its whitelist (UC-004), which
  // would turn a mistyped URL into the whole Home in isError.
  it("falls back to the default sort and order when the values are unknown", () => {
    const result = refundListSearchParamsSchema.parse({ sort: "cor", order: "cima" });

    expect(result.sort).toBe("created_at");
    expect(result.order).toBe("desc");
  });

  it("keeps a sort and order that belong to the server's whitelist", () => {
    const result = refundListSearchParamsSchema.parse({ sort: "amount_in_cents", order: "asc" });

    expect(result.sort).toBe("amount_in_cents");
    expect(result.order).toBe("asc");
  });

  // Absent status means "every status", not a status — so it must stay
  // undefined and be omitted from the request, not coerced to a value.
  it("leaves status undefined when absent and when unknown", () => {
    expect(refundListSearchParamsSchema.parse({}).status).toBeUndefined();
    expect(refundListSearchParamsSchema.parse({ status: "quase" }).status).toBeUndefined();
  });

  it("keeps a status that belongs to the server's whitelist", () => {
    expect(refundListSearchParamsSchema.parse({ status: "paid" }).status).toBe("paid");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/features/refunds/schemas/refund.test.ts`
Expected: FAIL — `result.sort` é `undefined` (a chave ainda não existe no schema).

- [ ] **Step 3: Estender o schema**

Em `src/features/refunds/schemas/refund.ts`, **depois** de `refundStatusSchema` (linha 52) acrescentar:

```ts
// Espelham as listas brancas de UC-004. Um valor fora delas responde 422 no
// servidor, então o cliente cai no padrão em vez de propagar o erro.
export const refundSortSchema = z.enum(["created_at", "amount_in_cents", "name", "status"]);
export const refundOrderSchema = z.enum(["asc", "desc"]);
```

Substituir `refundListSearchParamsSchema` (linhas 85-92) por:

```ts
export const refundListSearchParamsSchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  name: z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .optional(),
  // Ausente = todos os status. `.optional()` antes de `.catch()` para que
  // ausência passe pela validação e só um valor INVÁLIDO caia no catch.
  status: refundStatusSchema.optional().catch(undefined),
  sort: refundSortSchema.catch("created_at"),
  order: refundOrderSchema.catch("desc"),
});
```

E, junto dos demais tipos exportados no fim do arquivo:

```ts
export type RefundSort = z.output<typeof refundSortSchema>;
export type RefundOrder = z.output<typeof refundOrderSchema>;
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/features/refunds/schemas/refund.test.ts`
Expected: PASS

- [ ] **Step 5: Passar os parâmetros na query**

Em `src/features/refunds/api/refundQueries.ts`, trocar o import de tipos e estender a interface:

```ts
import type { RefundOrder, RefundSort, RefundStatus } from "../schemas/refund";

interface RefundListParams {
  page: number;
  perPage: number;
  name?: string;
  userId?: number;
  // Filtro e ordenação server-side (UC-004). Nunca ordenamos no cliente: ele
  // só tem a página atual, e ordenar 10 de N linhas parece funcionar.
  status?: RefundStatus;
  sort?: RefundSort;
  order?: RefundOrder;
}
```

E no `queryFn` de `refundListQuery`, dentro de `params`, acrescentar as três linhas (o Axios omite chaves `undefined`, então nada é enviado quando não há filtro):

```ts
          status: params.status,
          sort: params.sort,
          order: params.order,
```

- [ ] **Step 6: Escrever o teste do loader que falha**

Criar `src/router-loaders.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "@/lib/api";
import { homeLoader } from "./router-loaders";

// homeLoader calls requireSession() first, so every test needs a session that
// passes storedUserSchema (id included — a session without it is treated as
// logged out and redirected to /login).
function seedSession() {
  localStorage.setItem(TOKEN_STORAGE_KEY, "fake-jwt-token");
  localStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify({ id: 1, name: "Ana Souza", email: "ana@exemplo.com", role: "admin" })
  );
}

// The loader throws a redirect Response for a URL it wants normalized. Running
// it inside try/catch is what lets a test read the Location header instead of
// the returned params.
async function runLoader(url: string) {
  try {
    const data = await homeLoader({
      request: new Request(url),
      params: {},
      context: {} as never,
    });
    return { data, redirectedTo: null as string | null };
  } catch (thrown) {
    if (thrown instanceof Response) {
      return { data: null, redirectedTo: thrown.headers.get("Location") };
    }
    throw thrown;
  }
}

describe("homeLoader query params", () => {
  beforeEach(() => {
    seedSession();
    server.use(
      http.get("*/refunds", () =>
        HttpResponse.json({
          type: "Refund",
          count: 0,
          total: 0,
          sum_amount_in_cents: 0,
          page: 1,
          per_page: 10,
          total_pages: 0,
          attributes: [],
        })
      )
    );
  });

  // A default written in the URL is noise: it makes two URLs that mean the
  // same thing look different, and breaks the "shared link = same view"
  // property the Item 3 normalization established for page and name.
  it("redirects away a sort and order that are already the defaults", async () => {
    const { redirectedTo } = await runLoader("http://localhost/?sort=created_at&order=desc");

    expect(redirectedTo).toBe("/");
  });

  it("keeps a non-default sort and order in the URL", async () => {
    const { data, redirectedTo } = await runLoader("http://localhost/?sort=name&order=asc");

    expect(redirectedTo).toBeNull();
    expect(data).toMatchObject({ sort: "name", order: "asc" });
  });

  // An unknown value must be rewritten to the normalized URL, not passed
  // through to the API, which would answer 422.
  it("redirects an unknown sort to the normalized URL", async () => {
    const { redirectedTo } = await runLoader("http://localhost/?sort=cor");

    expect(redirectedTo).toBe("/");
  });

  it("keeps a valid status and drops an unknown one", async () => {
    const kept = await runLoader("http://localhost/?status=paid");
    expect(kept.redirectedTo).toBeNull();
    expect(kept.data).toMatchObject({ status: "paid" });

    const dropped = await runLoader("http://localhost/?status=quase");
    expect(dropped.redirectedTo).toBe("/");
  });
});
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `npx vitest run src/router-loaders.test.ts`
Expected: FAIL — o loader ainda não lê `sort`/`order`/`status`, então `?sort=name&order=asc` cai no ramo de redirect (os parâmetros sobram na URL normalizada).

- [ ] **Step 8: Estender o `homeLoader`**

Em `src/router-loaders.ts`, substituir o corpo de `homeLoader` (linhas 51-83) por:

```ts
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
```

- [ ] **Step 9: Rodar e ver passar**

Run: `npx vitest run src/router-loaders.test.ts`
Expected: PASS (4 testes)

- [ ] **Step 10: Pagar a dívida do `per_page` literal**

Em `src/test/msw/handlers.ts`, o handler de lista (`http.get("*/refunds", …)`) já usa `REFUNDS_PER_PAGE`. O literal está em `src/features/refunds/components/RequesterPanel.test.tsx:33` e `src/pages/PageHome.test.tsx:23` (`per_page: 10`). Trocar os dois por `REFUNDS_PER_PAGE`, importado de `@/features/refunds`.

- [ ] **Step 11: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/features/refunds/schemas/refund.ts src/features/refunds/schemas/refund.test.ts \
        src/features/refunds/api/refundQueries.ts src/router-loaders.ts src/router-loaders.test.ts \
        src/features/refunds/components/RequesterPanel.test.tsx src/pages/PageHome.test.tsx
git commit -m "feat(refunds): accept status, sort and order as list search params"
```

---

### Task 2: `formatDate` e o `ui/table` do registry

**Files:**
- Modify: `src/lib/format.ts`
- Create: `src/components/ui/table.tsx` (via CLI do shadcn)
- Test: `src/lib/format.test.ts` (existente)

**Interfaces:**
- Produces: `formatDate(value: string | null): string` — data em pt-BR, ou `"—"` quando `null`/inválida.
- Produces: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` de `@/components/ui/table`.

- [ ] **Step 1: Escrever o teste que falha**

Em `src/lib/format.test.ts`, acrescentar:

```ts
describe("formatDate", () => {
  it("formats an ISO timestamp as a pt-BR date", () => {
    expect(formatDate("2026-07-20T12:00:00.000Z")).toBe("20/07/2026");
  });

  // created_at is nullable in the API contract (refund.ts), so the formatter
  // must answer with a placeholder instead of throwing or printing
  // "Invalid Date" into a table cell.
  it("returns a dash for a null date", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("returns a dash for a string that is not a date", () => {
    expect(formatDate("não é data")).toBe("—");
  });
});
```

Atualizar o import do arquivo para incluir `formatDate`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL — `formatDate is not a function`.

- [ ] **Step 3: Implementar**

Em `src/lib/format.ts`, acrescentar:

```ts
// `created_at` é nullable no contrato (schemas/refund.ts), e uma data inválida
// não deve virar "Invalid Date" dentro de uma célula. O travessão é o mesmo
// símbolo usado como "sem valor" em tabelas.
export function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}
```

`timeZone: "UTC"` é deliberado: sem ele, um `created_at` de `2026-07-20T02:00:00Z` vira 19/07 no fuso de Brasília, e a data da tabela discorda da que o backend registrou.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/format.test.ts`
Expected: PASS

- [ ] **Step 5: Instalar o `ui/table` do registry**

```bash
npx shadcn@latest add table
```

Depois, **obrigatoriamente** (o CLI escreve num diretório literal `./@/` na raiz porque o `tsconfig.json` da raiz não tem `paths`):

```bash
mv ./@/components/ui/table.tsx src/components/ui/table.tsx
rm -rf ./@
git diff src/index.css
```

Se o `git diff src/index.css` mostrar um bloco `.dark { … }`, **reverter esse trecho**: o seletor de dark mode deste projeto é `data-theme`, via `@custom-variant`, não a classe `.dark`.

- [ ] **Step 6: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/lib/format.ts src/lib/format.test.ts src/components/ui/table.tsx package.json
git commit -m "feat: add a pt-BR date formatter and the shadcn table primitives"
```

---

### Task 3: `RefundsTable` — as seis colunas na Home

**Files:**
- Create: `src/features/refunds/components/RefundsTable.tsx`
- Create: `src/features/refunds/components/RefundsTable.test.tsx`
- Modify: `src/features/refunds/index.ts` (fachada)
- Modify: `src/pages/PageHome.tsx:213-254` (a `<ul>` vira a tabela)
- Modify: `package.json` (dependência)

**Interfaces:**
- Consumes: `formatDate` (Task 2), `Table*` (Task 2).
- Produces: `RefundsTable`, com as props
  `{ refunds: Refund[]; viewer: RefundViewer | null; isLoading: boolean }`.
  As props de ordenação entram na Task 5 e o filtro na Task 6 — esta task
  renderiza uma tabela estática.

- [ ] **Step 1: Instalar a dependência**

```bash
npm install @tanstack/react-table
```

Ela é *headless*: não traz marcação nem estilo. A marcação continua sendo a do `ui/table` (Task 2).

- [ ] **Step 2: Escrever o teste que falha**

Criar `src/features/refunds/components/RefundsTable.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { refundFixture } from "@/test/msw/handlers";
import type { RefundViewer } from "../lib/getRefundHref";
import type { Refund } from "../schemas/refund";
import RefundsTable from "./RefundsTable";

const adminViewer: RefundViewer = { id: 99, role: "admin" };

// Two refunds from DIFFERENT people: the requester column only earns its place
// when the rows are not all the same person, and a single-row fixture could
// not tell "the column renders" from "the column renders the wrong name".
const refunds: Refund[] = [
  {
    ...refundFixture,
    id: 1,
    name: "Almoço com cliente",
    created_at: "2026-07-20T12:00:00.000Z",
    user: { id: 1, name: "Ana Souza", has_avatar: false },
  } as Refund,
  {
    ...refundFixture,
    id: 2,
    name: "Passagem aérea",
    amount_in_cents: 120000,
    created_at: "2026-07-21T12:00:00.000Z",
    user: { id: 2, name: "Bruno Lima", has_avatar: false },
  } as Refund,
];

function renderTable(viewer: RefundViewer | null = adminViewer) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        Component: () => <RefundsTable refunds={refunds} viewer={viewer} isLoading={false} />,
      },
    ],
    { initialEntries: ["/"] }
  );

  return render(<RouterProvider router={router} />);
}

describe("RefundsTable", () => {
  it("renders one row per refund inside a table", () => {
    renderTable();

    expect(screen.getByRole("table")).toBeInTheDocument();
    // Header row + two data rows.
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("shows the requester name of each row", () => {
    renderTable();

    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("Bruno Lima")).toBeInTheDocument();
  });

  it("shows the creation date of each row, formatted", () => {
    renderTable();

    expect(screen.getByText("20/07/2026")).toBeInTheDocument();
    expect(screen.getByText("21/07/2026")).toBeInTheDocument();
  });

  it("shows the amount and the status of each row", () => {
    renderTable();

    expect(screen.getByText("R$ 45,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.200,00")).toBeInTheDocument();
    expect(screen.getAllByText("Pendente")).toHaveLength(2);
  });

  // The row's destination still follows the shared BR-016 rule. Asserting the
  // href (not just that a link exists) is what keeps the table honest against
  // the Home's existing row-navigation tests, which look the refund up by its
  // accessible name.
  it("links the title to the review route for an admin viewing someone else's refund", () => {
    renderTable(adminViewer);

    expect(screen.getByRole("link", { name: "Almoço com cliente" })).toHaveAttribute(
      "href",
      "/refunds/1/review"
    );
  });

  it("links the title to the plain detail route for a standard viewer", () => {
    renderTable({ id: 42, role: "standard" });

    expect(screen.getByRole("link", { name: "Almoço com cliente" })).toHaveAttribute(
      "href",
      "/refunds/1"
    );
  });

  // The category is an icon: without a text alternative the column would be
  // silent to a screen reader, which the old list layout avoided by printing
  // the label next to the title.
  it("gives the category icon a text alternative", () => {
    renderTable();

    expect(screen.getAllByText("Alimentação")).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/features/refunds/components/RefundsTable.test.tsx`
Expected: FAIL — `Failed to resolve import "./RefundsTable"`.

- [ ] **Step 4: Implementar o componente**

Criar `src/features/refunds/components/RefundsTable.tsx`:

```tsx
import { useMemo } from "react";
import { Link } from "react-router";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCentsToBRL, formatDate } from "@/lib/format";
import { CATEGORIES } from "../constants/categories";
import { REFUND_STATUS } from "../constants/status";
import { getRefundHref, type RefundViewer } from "../lib/getRefundHref";
import type { Refund } from "../schemas/refund";

// Column-level styling hook. The TanStack types carry no `className`, so the
// table's own meta slot is augmented instead of threading a parallel lookup
// table through every render.
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}

interface RefundsTableProps {
  refunds: Refund[];
  viewer: RefundViewer | null;
  isLoading: boolean;
}

// Os ids das colunas ordenáveis são EXATAMENTE os valores que `sort` aceita em
// UC-004. Isso não é coincidência: a Task 5 usa `column.id` direto como
// parâmetro, então um id divergente viraria um 422 silencioso.
function createRefundColumns(viewer: RefundViewer | null): ColumnDef<Refund>[] {
  return [
    {
      id: "category",
      header: () => <span className="sr-only">Categoria</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const category = CATEGORIES[row.original.category];
        const CategoryIcon = category.icon;
        return (
          <>
            <CategoryIcon className="size-5 text-muted-foreground" aria-hidden />
            {/* O ícone sozinho é silencioso para leitor de tela; na lista
                antiga o rótulo da categoria ficava ao lado do título. */}
            <span className="sr-only">{category.label}</span>
          </>
        );
      },
    },
    {
      id: "name",
      header: "Título",
      cell: ({ row }) => (
        <Link
          to={getRefundHref(row.original, viewer)}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      id: "user",
      header: "Solicitante",
      enableSorting: false,
      cell: ({ row }) => row.original.user.name,
    },
    {
      id: "created_at",
      header: "Data",
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={REFUND_STATUS[row.original.status].variant}>
          {REFUND_STATUS[row.original.status].label}
        </Badge>
      ),
    },
    {
      id: "amount_in_cents",
      header: "Valor",
      cell: ({ row }) => formatCentsToBRL(row.original.amount_in_cents),
      meta: { className: "text-right" },
    },
  ];
}

export default function RefundsTable({ refunds, viewer, isLoading }: RefundsTableProps) {
  const columns = useMemo(() => createRefundColumns(viewer), [viewer]);

  const table = useReactTable({
    data: refunds,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // O cliente tem 10 de N linhas. Ordenar, filtrar ou paginar aqui
    // trabalharia sobre a página, não sobre o conjunto — o erro que originou
    // o ciclo de backend da consulta da listagem.
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className={cn(header.column.columnDef.meta?.className)}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-6 text-center text-muted-foreground">
                Nenhuma solicitação encontrada.
              </TableCell>
            </TableRow>
          )}
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className={cn(cell.column.columnDef.meta?.className)}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/features/refunds/components/RefundsTable.test.tsx`
Expected: PASS (7 testes)

- [ ] **Step 6: Exportar pela fachada**

Em `src/features/refunds/index.ts`, acrescentar:

```ts
// A listagem da Home como tabela (Item 13). Ordenação e filtro são
// server-side: o componente não ordena nada por conta própria.
export { default as RefundsTable } from "./components/RefundsTable";
```

- [ ] **Step 7: Montar na Home**

Em `src/pages/PageHome.tsx`:

1. Trocar o import de `@/features/refunds` para incluir `RefundsTable` e remover `CATEGORIES` e `REFUND_STATUS` se ficarem sem uso.
2. Remover a função `RefundRowSkeleton` (linhas 15-28) e os blocos `{isLoading && (<ul>…</ul>)}` (203-211) e `{!isLoading && !isError && (<ul>…</ul>)}` (213-254).
3. No lugar dos dois blocos:

```tsx
      {!isError && (
        <RefundsTable refunds={data?.attributes ?? []} viewer={user} isLoading={isLoading} />
      )}
```

O bloco de `isError` (197-201) e a paginação (256-280) ficam como estão. A paginação continua server-side e fora da tabela.

- [ ] **Step 8: Rodar a suíte inteira e ver o que a troca quebrou**

Run: `npx vitest run`
Expected: os testes de `PageHome` que buscam a linha por `findByRole("link", …)` **continuam passando** (o link mudou de lugar, não de nome acessível). Se algum teste procurar a estrutura de `<ul>`/`<li>`, ajustar o teste para a tabela — não o componente.

- [ ] **Step 9: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint && npm run build
git add src/features/refunds/components/RefundsTable.tsx \
        src/features/refunds/components/RefundsTable.test.tsx \
        src/features/refunds/index.ts src/pages/PageHome.tsx package.json package-lock.json
git commit -m "feat(refunds): render the home list as a table with requester and date"
```

Anotar o tamanho do bundle reportado pelo `npm run build` — ele entra no relatório de fechamento (Task 13).

---

### Task 4: Visibilidade das colunas — papel e largura de tela

**Files:**
- Modify: `src/features/refunds/components/RefundsTable.tsx`
- Modify: `src/features/refunds/components/RefundsTable.test.tsx`

**Interfaces:**
- Consumes: `RefundsTable` (Task 3).
- Produces: nenhuma assinatura nova; a coluna `user` passa a ser condicional.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar em `RefundsTable.test.tsx`:

```tsx
describe("RefundsTable column visibility", () => {
  // For a standard user every row is their own, so a requester column would
  // repeat the same name down the page. The column is dropped, not blanked —
  // an empty column still costs a header and horizontal space.
  it("hides the requester column for a standard viewer", () => {
    renderTable({ id: 1, role: "standard" });

    expect(screen.queryByText("Solicitante")).not.toBeInTheDocument();
    expect(screen.queryByText("Bruno Lima")).not.toBeInTheDocument();
  });

  it("shows the requester column for an admin viewer", () => {
    renderTable(adminViewer);

    expect(screen.getByText("Solicitante")).toBeInTheDocument();
  });

  // Narrow screens drop category, requester and date via CSS so the table
  // degrades to the title/status/amount row the Home had before. Asserting the
  // class is the only option here: jsdom has no layout engine, so a real
  // media query cannot be evaluated in a unit test.
  it("marks the columns that collapse on narrow screens", () => {
    renderTable(adminViewer);

    expect(screen.getByText("Data").closest("th")).toHaveClass("hidden");
    expect(screen.getByText("Solicitante").closest("th")).toHaveClass("hidden");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/features/refunds/components/RefundsTable.test.tsx`
Expected: FAIL — a coluna "Solicitante" aparece para o viewer standard e os `th` não têm `hidden`.

- [ ] **Step 3: Implementar**

Em `createRefundColumns`, acrescentar `meta.className` às três colunas que somem no mobile:

- `category`: `meta: { className: "hidden w-10 sm:table-cell" }`
- `user`: `meta: { className: "hidden sm:table-cell" }`
- `created_at`: `meta: { className: "hidden sm:table-cell" }`

E, em `RefundsTable`, ligar a visibilidade por papel:

```tsx
export default function RefundsTable({ refunds, viewer, isLoading }: RefundsTableProps) {
  const columns = useMemo(() => createRefundColumns(viewer), [viewer]);

  // Dois mecanismos diferentes de propósito: largura de tela é CSS
  // (meta.className), papel é estado da tabela. Misturar os dois faria uma
  // media query depender de JS medindo viewport.
  const columnVisibility = useMemo(
    () => ({ user: viewer?.role === "admin" }),
    [viewer?.role]
  );

  const table = useReactTable({
    data: refunds,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { columnVisibility },
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
  });
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/features/refunds/components/RefundsTable.test.tsx`
Expected: PASS

- [ ] **Step 5: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/features/refunds/components/RefundsTable.tsx src/features/refunds/components/RefundsTable.test.tsx
git commit -m "feat(refunds): drop the requester column for non-admins and collapse columns on mobile"
```

---

### Task 5: Ordenação server-side pelos cabeçalhos

**Files:**
- Modify: `src/features/refunds/components/RefundsTable.tsx`
- Modify: `src/features/refunds/components/RefundsTable.test.tsx`
- Modify: `src/pages/PageHome.tsx`
- Modify: `src/pages/PageHome.test.tsx`

**Interfaces:**
- Consumes: `RefundSort`, `RefundOrder` (Task 1); `RefundsTable` (Tasks 3-4).
- Produces: `RefundsTable` ganha as props
  `{ sort: RefundSort; order: RefundOrder; onSortChange: (column: RefundSort) => void }`.
- Produces: `PageHome` ganha `updateListLocation` aceitando `sort`/`order` — ver Step 5.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar em `RefundsTable.test.tsx` (e estender `renderTable` para aceitar os props novos):

```tsx
describe("RefundsTable sorting", () => {
  // Only the four columns the API accepts in `sort` (UC-004) may look
  // clickable. A button on category or requester would either do nothing or,
  // worse, invite a client-side sort over the 10 rows of the current page.
  it("offers a sort button only for the columns the API can sort", () => {
    renderTable(adminViewer);

    expect(screen.getByRole("button", { name: /Título/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Data/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Status/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Valor/ })).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /Solicitante/ })).not.toBeInTheDocument();
  });

  it("reports the clicked column to the caller", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    renderTable(adminViewer, { onSortChange });

    await user.click(screen.getByRole("button", { name: /Valor/ }));

    expect(onSortChange).toHaveBeenCalledWith("amount_in_cents");
  });

  // The sorted column must be announced, not just drawn with an arrow: a
  // screen reader user otherwise has no way to know which column is active.
  it("marks the active column with aria-sort", () => {
    renderTable(adminViewer, { sort: "amount_in_cents", order: "asc" });

    expect(screen.getByText("Valor").closest("th")).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getByText("Data").closest("th")).toHaveAttribute("aria-sort", "none");
  });
});
```

Ajustar o helper no topo do arquivo:

```tsx
function renderTable(
  viewer: RefundViewer | null = adminViewer,
  overrides: Partial<React.ComponentProps<typeof RefundsTable>> = {}
) {
  const props = {
    refunds,
    viewer,
    isLoading: false,
    sort: "created_at" as const,
    order: "desc" as const,
    onSortChange: () => {},
    ...overrides,
  };

  const router = createMemoryRouter([{ path: "/", Component: () => <RefundsTable {...props} /> }], {
    initialEntries: ["/"],
  });

  return render(<RouterProvider router={router} />);
}
```

Acrescentar `import userEvent from "@testing-library/user-event";` e `vi` ao import de `vitest`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/features/refunds/components/RefundsTable.test.tsx`
Expected: FAIL — não existe botão nos cabeçalhos.

- [ ] **Step 3: Implementar na tabela**

Em `RefundsTable.tsx`, marcar as colunas não-ordenáveis com `enableSorting: false` (já feito em `category` e `user` nas Tasks 3-4) e trocar o render do cabeçalho:

```tsx
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RefundOrder, RefundSort } from "../schemas/refund";

interface RefundsTableProps {
  refunds: Refund[];
  viewer: RefundViewer | null;
  isLoading: boolean;
  sort: RefundSort;
  order: RefundOrder;
  onSortChange: (column: RefundSort) => void;
}
```

E, dentro do `TableHeader`:

```tsx
              {headerGroup.headers.map((header) => {
                const isSorted = header.column.id === sort;
                const label = flexRender(header.column.columnDef.header, header.getContext());
                const SortIcon = !isSorted ? ChevronsUpDown : order === "asc" ? ArrowUp : ArrowDown;

                return (
                  <TableHead
                    key={header.id}
                    className={cn(header.column.columnDef.meta?.className)}
                    // Sem isto o estado de ordenação é só uma seta desenhada:
                    // invisível para quem usa leitor de tela.
                    aria-sort={
                      !header.column.getCanSort()
                        ? undefined
                        : !isSorted
                          ? "none"
                          : order === "asc"
                            ? "ascending"
                            : "descending"
                    }
                  >
                    {header.column.getCanSort() ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8"
                        onClick={() => onSortChange(header.column.id as RefundSort)}
                      >
                        {label}
                        <SortIcon className="size-3.5" aria-hidden />
                      </Button>
                    ) : (
                      label
                    )}
                  </TableHead>
                );
              })}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/features/refunds/components/RefundsTable.test.tsx`
Expected: PASS

- [ ] **Step 5: Ligar a ordenação à URL na Home**

Em `src/pages/PageHome.tsx`:

1. Ler os parâmetros novos do loader:

```tsx
  const { page, perPage, name, status, sort, order } = useLoaderData<typeof homeLoader>();
```

2. Passar para a query: `useRefunds({ page, perPage, name, status, sort, order })`.

3. Acrescentar a tabela de lookup no **escopo de módulo** (fora do componente, logo abaixo dos imports) — recriá-la por render a tornaria uma dependência instável do `useCallback` abaixo:

```tsx
// Coluna nova começa na direção que faz sentido para o tipo do dado; a mesma
// coluna clicada de novo inverte. Tabela de lookup em vez de ternários
// encadeados, como REFUND_STATUS e RECEIPT_COPY.
const DEFAULT_ORDER_BY_COLUMN: Record<RefundSort, RefundOrder> = {
  name: "asc",
  status: "asc",
  created_at: "desc",
  amount_in_cents: "desc",
};
```

4. Acrescentar o handler dentro do componente, ao lado de `updateListLocation`:

```tsx
  const handleSortChange = useCallback(
    (column: RefundSort) => {
      const nextOrder: RefundOrder =
        column === sort ? (order === "asc" ? "desc" : "asc") : DEFAULT_ORDER_BY_COLUMN[column];

      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        // Ordenar reinicia a paginação: a página 3 de uma ordem é um conjunto
        // sem relação com a página 3 da outra.
        nextParams.delete("page");

        if (column === "created_at") nextParams.delete("sort");
        else nextParams.set("sort", column);

        if (nextOrder === "desc") nextParams.delete("order");
        else nextParams.set("order", nextOrder);

        return nextParams;
      });
    },
    [order, setSearchParams, sort]
  );
```

`DEFAULT_ORDER_BY_COLUMN` deve ficar **fora** do componente (constante de módulo), não recriada por render.

5. Passar para a tabela:

```tsx
        <RefundsTable
          refunds={data?.attributes ?? []}
          viewer={user}
          isLoading={isLoading}
          sort={sort}
          order={order}
          onSortChange={handleSortChange}
        />
```

- [ ] **Step 6: Escrever o teste de integração da Home**

Em `src/pages/PageHome.test.tsx`, atualizar o loader stub para devolver os campos novos:

```tsx
        loader: () => ({ page, perPage: REFUNDS_PER_PAGE, name: undefined, status: undefined, sort: "created_at", order: "desc" }),
```

E acrescentar:

```tsx
describe("PageHome sorting", () => {
  // The proof that sorting is server-side: the click must reach the URL (and
  // from there the request), not reorder the rows already in memory. A
  // client-side sort would leave the URL untouched and silently sort 10 of 24
  // rows — the exact bug the backend query cycle exists to prevent.
  it("writes the clicked column to the URL and resets the page", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));
    const user = userEvent.setup();

    const { router } = renderPageHome("/?page=2", "admin", 2);

    await user.click(await screen.findByRole("button", { name: /Valor/ }));

    await waitFor(() => {
      expect(router.state.location.search).toBe("?sort=amount_in_cents");
    });
  });

  // The default direction carries no information, so it stays out of the URL —
  // the same rule page=1 and the empty name already follow.
  it("omits the default sort from the URL and toggles direction on a second click", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));
    const user = userEvent.setup();

    const { router } = renderPageHome("/", "admin", 2);

    const dateHeader = await screen.findByRole("button", { name: /Data/ });
    await user.click(dateHeader);

    await waitFor(() => {
      expect(router.state.location.search).toBe("?order=asc");
    });
  });
});
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run src/pages/PageHome.test.tsx`
Expected: PASS

- [ ] **Step 8: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/features/refunds/components/RefundsTable.tsx \
        src/features/refunds/components/RefundsTable.test.tsx \
        src/pages/PageHome.tsx src/pages/PageHome.test.tsx
git commit -m "feat(refunds): sort the table server-side through the URL"
```

---

### Task 6: Toolbar — filtro por status

**Files:**
- Create: `src/features/refunds/components/RefundsToolbar.tsx`
- Create: `src/features/refunds/components/RefundsToolbar.test.tsx`
- Modify: `src/features/refunds/constants/status.ts`
- Modify: `src/features/refunds/index.ts`
- Modify: `src/pages/PageHome.tsx`
- Modify: `src/pages/PageHome.test.tsx`

**Interfaces:**
- Consumes: `RefundStatus` e o schema da Task 1; `REFUND_STATUS` (existente).
- Produces: `STATUS_FILTER_ORDER: readonly RefundStatus[]` em `constants/status.ts`.
- Produces: `RefundsToolbar` com props
  `{ status: RefundStatus | undefined; onStatusChange: (status: RefundStatus | undefined) => void }`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/features/refunds/components/RefundsToolbar.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RefundsToolbar from "./RefundsToolbar";

describe("RefundsToolbar", () => {
  it("shows the current filter, defaulting to every status", () => {
    render(<RefundsToolbar status={undefined} onStatusChange={() => {}} />);

    expect(screen.getByRole("combobox", { name: "Filtrar por status" })).toHaveTextContent("Todos");
  });

  it("shows the selected status when one is active", () => {
    render(<RefundsToolbar status="paid" onStatusChange={() => {}} />);

    expect(screen.getByRole("combobox", { name: "Filtrar por status" })).toHaveTextContent("Pago");
  });

  it("reports the chosen status to the caller", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(<RefundsToolbar status={undefined} onStatusChange={onStatusChange} />);

    await user.click(screen.getByRole("combobox", { name: "Filtrar por status" }));
    await user.click(screen.getByRole("option", { name: "Aprovado" }));

    expect(onStatusChange).toHaveBeenCalledWith("approved");
  });

  // "Todos" is the absence of a filter, and the caller's contract says that is
  // `undefined`. Radix forbids an empty-string SelectItem value, so the
  // sentinel exists inside the component and must not leak out of it.
  it("reports undefined, not a sentinel string, when every status is chosen", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(<RefundsToolbar status="paid" onStatusChange={onStatusChange} />);

    await user.click(screen.getByRole("combobox", { name: "Filtrar por status" }));
    await user.click(screen.getByRole("option", { name: "Todos" }));

    expect(onStatusChange).toHaveBeenCalledWith(undefined);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/features/refunds/components/RefundsToolbar.test.tsx`
Expected: FAIL — `Failed to resolve import "./RefundsToolbar"`.

- [ ] **Step 3: Acrescentar a ordem de exibição dos status**

Em `src/features/refunds/constants/status.ts`, no fim:

```ts
// Ordem de exibição no filtro: o ciclo de vida de uma solicitação, não a
// ordem alfabética nem a ordem das chaves do Record acima.
export const STATUS_FILTER_ORDER: readonly RefundStatus[] = [
  "pending",
  "approved",
  "paid",
  "rejected",
];
```

- [ ] **Step 4: Implementar o componente**

Criar `src/features/refunds/components/RefundsToolbar.tsx`:

```tsx
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REFUND_STATUS, STATUS_FILTER_ORDER } from "../constants/status";
import type { RefundStatus } from "../schemas/refund";

// O Radix Select recusa um SelectItem com value="" (string vazia é o valor
// "sem seleção" dele), então "todos" precisa de um valor próprio. Ele existe
// só dentro deste componente: a prop de saída é `undefined`, que é o que a
// URL e a API entendem por "sem filtro".
const EVERY_STATUS = "all";

interface RefundsToolbarProps {
  status: RefundStatus | undefined;
  onStatusChange: (status: RefundStatus | undefined) => void;
}

export default function RefundsToolbar({ status, onStatusChange }: RefundsToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="refund-status-filter" className="sr-only">
        Filtrar por status
      </Label>
      <Select
        value={status ?? EVERY_STATUS}
        onValueChange={(value) =>
          onStatusChange(value === EVERY_STATUS ? undefined : (value as RefundStatus))
        }
      >
        <SelectTrigger id="refund-status-filter" aria-label="Filtrar por status" className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EVERY_STATUS}>Todos</SelectItem>
          {STATUS_FILTER_ORDER.map((value) => (
            <SelectItem key={value} value={value}>
              {REFUND_STATUS[value].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/features/refunds/components/RefundsToolbar.test.tsx`
Expected: PASS (4 testes). Se estourar `target.hasPointerCapture is not a function`, o polyfill de jsdom em `src/test/setup.ts` sumiu — restaure-o, não contorne o teste.

- [ ] **Step 6: Exportar e montar na Home**

Em `src/features/refunds/index.ts`:

```ts
// Toolbar da listagem: filtro por status, escrito na URL e resolvido no
// servidor (UC-004).
export { default as RefundsToolbar } from "./components/RefundsToolbar";
```

Em `src/pages/PageHome.tsx`, acrescentar o handler ao lado de `handleSortChange`:

```tsx
  const handleStatusChange = useCallback(
    (nextStatus: RefundStatus | undefined) => {
      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        // Trocar o filtro reinicia a paginação: a página 3 do conjunto antigo
        // pode nem existir no novo. É a mesma regra da busca por nome.
        nextParams.delete("page");

        if (nextStatus) nextParams.set("status", nextStatus);
        else nextParams.delete("status");

        return nextParams;
      });
    },
    [setSearchParams]
  );
```

E, na marcação, envolver a busca e o filtro numa linha só, substituindo o `<RefundSearch … />` solto (linha 195):

```tsx
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <RefundSearch
            key={name ?? ""}
            initialSearch={name ?? ""}
            updateListLocation={updateListLocation}
          />
        </div>
        <RefundsToolbar status={status} onStatusChange={handleStatusChange} />
      </div>
```

- [ ] **Step 7: Escrever o teste de integração da Home**

Em `src/pages/PageHome.test.tsx`:

```tsx
describe("PageHome status filter", () => {
  // Same proof as the sorting test: the filter must reach the URL (and the
  // request), not hide rows already fetched. Starting on page 2 makes the
  // reset assertion real — a page number from the unfiltered set is
  // meaningless once the set changes.
  it("writes the chosen status to the URL and resets the page", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));
    const user = userEvent.setup();

    const { router } = renderPageHome("/?page=2", "admin", 2);

    await user.click(await screen.findByRole("combobox", { name: "Filtrar por status" }));
    await user.click(screen.getByRole("option", { name: "Pago" }));

    await waitFor(() => {
      expect(router.state.location.search).toBe("?status=paid");
    });
  });

  // The request itself is what proves the filter is server-side: asserting the
  // rendered rows could pass with a client-side filter over the current page.
  it("sends the status to the API", async () => {
    let capturedStatus: string | null = null;
    server.use(
      http.get("*/refunds", ({ request }) => {
        capturedStatus = new URL(request.url).searchParams.get("status");
        return HttpResponse.json(pagedListResponse());
      })
    );

    renderPageHome("/", "admin", 2, { status: "paid" });

    await waitFor(() => {
      expect(capturedStatus).toBe("paid");
    });
  });
});
```

Estender `renderPageHome` com um quarto parâmetro de overrides do loader:

```tsx
function renderPageHome(
  initialEntry = "/",
  role: "standard" | "admin" = "standard",
  id = 1,
  loaderOverrides: Record<string, unknown> = {}
) {
  seedSession(role, id);
  const url = new URL(initialEntry, "http://localhost");
  const page = Number(url.searchParams.get("page") ?? 1);

  const router = createMemoryRouter(
    [
      {
        path: "/",
        loader: () => ({
          page,
          perPage: REFUNDS_PER_PAGE,
          name: undefined,
          status: undefined,
          sort: "created_at",
          order: "desc",
          ...loaderOverrides,
        }),
        Component: PageHome,
      },
    ],
    { initialEntries: [initialEntry] }
  );
  // …resto igual
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx vitest run src/pages/PageHome.test.tsx`
Expected: PASS

- [ ] **Step 9: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/features/refunds/components/RefundsToolbar.tsx \
        src/features/refunds/components/RefundsToolbar.test.tsx \
        src/features/refunds/constants/status.ts src/features/refunds/index.ts \
        src/pages/PageHome.tsx src/pages/PageHome.test.tsx
git commit -m "feat(refunds): filter the list by status through the URL"
```

---

### Task 7: O rótulo do card de resumo acompanha o filtro

**Files:**
- Modify: `src/pages/PageHome.tsx:148-171`
- Modify: `src/pages/PageHome.test.tsx`

**Interfaces:**
- Consumes: `status` do loader (Tasks 1 e 6); `REFUND_STATUS` (existente).

- [ ] **Step 1: Escrever o teste que falha**

Em `src/pages/PageHome.test.tsx`, dentro de `describe("PageHome money card")`:

```tsx
  // With a status filter active the API's sum covers only that status, so the
  // fixed "Solicitado" label would put a correct number under a wrong name.
  it("labels the admin money card with the active status filter", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));

    renderPageHome("/", "admin", 2, { status: "paid" });

    expect(await screen.findByText("Pago")).toBeInTheDocument();
    expect(screen.queryByText("Solicitado")).not.toBeInTheDocument();
  });

  it("goes back to 'Solicitado' when no status filter is active", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));

    renderPageHome("/", "admin", 2);

    expect(await screen.findByText("Solicitado")).toBeInTheDocument();
  });
```

Atenção ao primeiro teste: os badges das linhas também dizem "Pago" quando o fixture tem esse status. `pagedListResponse()` devolve linhas `pending`, então "Pago" só existe no rótulo do card — mantenha assim.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/pages/PageHome.test.tsx`
Expected: FAIL — o card mostra "Solicitado" mesmo com o filtro ativo.

- [ ] **Step 3: Implementar**

Em `src/pages/PageHome.tsx`, acrescentar antes do `return`:

```tsx
  // Com filtro ativo, `sum_amount_in_cents` cobre só aquele status (UC-004).
  // O rótulo segue o número; um número certo com nome errado é pior que
  // nenhum dos dois.
  const moneyCardLabel = isAdmin
    ? status
      ? REFUND_STATUS[status].label
      : "Solicitado"
    : "Aprovado + pago";
```

E trocar o `CardTitle` do segundo card (linha 151) por `{moneyCardLabel}`.

`REFUND_STATUS` precisa voltar ao import de `@/features/refunds` se a Task 3 o removeu.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/pages/PageHome.test.tsx`
Expected: PASS

- [ ] **Step 5: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/pages/PageHome.tsx src/pages/PageHome.test.tsx
git commit -m "fix(home): label the admin money card with the active status filter"
```

---

### Task 8: Comprovante da despesa na tela de revisão

A menor task do ciclo, e a que fecha a omissão que motivou o pedido.

**Files:**
- Modify: `src/pages/PageRefundReview.tsx:70-72`
- Modify: `src/pages/PageRefundReview.test.tsx`

**Interfaces:**
- Consumes: `ReceiptPreview` com `kind` (existente).

- [ ] **Step 1: Escrever o teste que falha**

Em `src/pages/PageRefundReview.test.tsx`, acrescentar:

```tsx
describe("PageRefundReview receipts", () => {
  // The admin approves or rejects based on the expense receipt. Showing only
  // the payment receipt means deciding without the document that justifies
  // the request — the detail page has shown both all along.
  it("shows the expense receipt so the admin can judge the request", async () => {
    renderReviewPage();

    expect(
      await screen.findByRole("button", { name: "Ver comprovante em tela cheia" })
    ).toBeInTheDocument();
  });

  // On a paid refund BOTH receipts are on screen. The accessible names must
  // stay distinct, or a screen reader user hears the same button twice and
  // cannot tell which file each one opens.
  it("shows both receipts, with distinct accessible names, on a paid refund", async () => {
    renderReviewPage({ status: "paid" });

    expect(
      await screen.findByRole("button", { name: "Ver comprovante em tela cheia" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ver comprovante de pagamento em tela cheia" })
    ).toBeInTheDocument();
  });
});
```

Adaptar `renderReviewPage` ao helper que já existe no arquivo; se ele ainda não aceitar overrides do reembolso, acrescentar um parâmetro que sobrescreva o fixture via `server.use(http.get("*/refunds/:id", …))`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/pages/PageRefundReview.test.tsx`
Expected: FAIL no primeiro teste — só o botão de pagamento existe, e só quando pago.

- [ ] **Step 3: Implementar**

Em `src/pages/PageRefundReview.tsx`, substituir o bloco das linhas 70-72 por:

```tsx
              {/* O comprovante da despesa é o documento que a decisão julga,
                  então aparece sempre — a mesma ordem da página de detalhe. */}
              {id && <ReceiptPreview refundId={id} refundName={refund.name} kind="expense" />}
              {id && refund.status === "paid" && (
                <ReceiptPreview refundId={id} refundName={refund.name} kind="payment" />
              )}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/pages/PageRefundReview.test.tsx`
Expected: PASS

- [ ] **Step 5: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/pages/PageRefundReview.tsx src/pages/PageRefundReview.test.tsx
git commit -m "fix(review): show the expense receipt on the review screen"
```

---

### Task 9: Card "Total" no painel do solicitante

**Files:**
- Modify: `src/features/refunds/components/RequesterPanel.tsx:46-74`
- Modify: `src/features/refunds/components/RequesterPanel.test.tsx`

**Interfaces:**
- Consumes: `useRefundStats` (existente).

- [ ] **Step 1: Escrever o teste que falha**

Em `RequesterPanel.test.tsx`:

```tsx
  // The four per-status counters answer "how is this person's history split";
  // the total answers "how often has this person asked at all". The fixture
  // sums to 11 (2 + 5 + 3 + 1), a number none of the four carries, so the
  // assertion cannot pass by accidentally matching one of them.
  it("shows a total counter summing every status", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(requesterListResponse())));
    renderPanel();

    expect(await screen.findByText("Total")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
  });

  // A failed stats request must not render a total of 0 — same reasoning as
  // the four counters it is derived from.
  it("hides the total when stats fail to load", async () => {
    server.use(
      http.get("*/refunds", () => HttpResponse.json(requesterListResponse())),
      http.get("*/users/:id/refund-stats", () => HttpResponse.json({}, { status: 500 }))
    );
    renderPanel();

    await screen.findByRole("alert");
    expect(screen.queryByText("Total")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/features/refunds/components/RequesterPanel.test.tsx`
Expected: FAIL — não existe "Total".

- [ ] **Step 3: Implementar**

Em `RequesterPanel.tsx`, dentro do bloco `{stats && !isStatsLoading && !isStatsError && (…)}`, trocar o grid por:

```tsx
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {/* Contagem, não valor: somar dinheiro dos quatro status juntaria
                previsão, passivo, despesa liquidada e nada — é o que o
                comentário de refundStatsResponseSchema registra, e ele já
                prevê esta soma de CONTAGENS no cliente. */}
            <div className="flex flex-col gap-1 rounded-lg border p-3">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-xl font-semibold">
                {STATUS_ORDER.reduce((sum, status) => sum + stats.by_status[status].count, 0)}
              </span>
            </div>
            {STATUS_ORDER.map((status) => (
              <div key={status} className="flex flex-col gap-1 rounded-lg border p-3">
                <span className="text-xs text-muted-foreground">{REFUND_STATUS[status].label}</span>
                <span className="text-lg font-semibold">{stats.by_status[status].count}</span>
              </div>
            ))}
          </div>
```

Atualizar também o grid do skeleton (linhas 47-53) para `sm:grid-cols-5` e 5 blocos, senão o layout pula quando os dados chegam.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/features/refunds/components/RequesterPanel.test.tsx`
Expected: PASS

- [ ] **Step 5: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/features/refunds/components/RequesterPanel.tsx src/features/refunds/components/RequesterPanel.test.tsx
git commit -m "feat(review): add a total counter to the requester panel"
```

---

### Task 10: Destaque da solicitação atual no painel

**Files:**
- Modify: `src/features/refunds/components/RequesterPanel.tsx`
- Modify: `src/features/refunds/components/RequesterPanel.test.tsx`
- Modify: `src/pages/PageRefundReview.tsx:88`

**Interfaces:**
- Produces: `RequesterPanel` ganha a prop obrigatória `currentRefundId: number`.

- [ ] **Step 1: Escrever o teste que falha**

Em `RequesterPanel.test.tsx`, estender `renderPanel` para passar `currentRefundId` (padrão `5`, o id do fixture) e acrescentar:

```tsx
  // aria-current is the half that a screen reader can perceive: the background
  // colour alone tells a sighted user where they are and tells everyone else
  // nothing. Both halves ship together or the highlight is decorative.
  it("marks the current refund's row with aria-current", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(requesterListResponse())));
    renderPanel(adminViewer, 5);

    const row = await screen.findByRole("link", { name: /Passagem aérea/ });
    expect(row).toHaveAttribute("aria-current", "page");
  });

  it("leaves other rows without aria-current", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(requesterListResponse())));
    renderPanel(adminViewer, 999);

    const row = await screen.findByRole("link", { name: /Passagem aérea/ });
    expect(row).not.toHaveAttribute("aria-current");
  });
```

Assinatura do helper: `function renderPanel(viewer: RefundViewer | null = adminViewer, currentRefundId = 5)`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/features/refunds/components/RequesterPanel.test.tsx`
Expected: FAIL — nenhum `aria-current` é emitido.

- [ ] **Step 3: Implementar**

Em `RequesterPanel.tsx`:

```tsx
interface RequesterPanelProps {
  requester: { id: number; name: string };
  viewer: RefundViewer | null;
  // Qual linha desta lista é a solicitação aberta agora. Também é a âncora
  // das setas de navegação (Task 11).
  currentRefundId: number;
}
```

E no `map` das linhas:

```tsx
                {list.attributes.map((refund) => {
                  const isCurrent = refund.id === currentRefundId;
                  return (
                    <li key={refund.id} className="border-b last:border-b-0">
                      <Link
                        to={getRefundHref(refund, viewer)}
                        // Cor sozinha não é sinal acessível; aria-current é o
                        // que um leitor de tela anuncia.
                        aria-current={isCurrent ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between gap-3 px-3 py-2 text-sm transition hover:bg-accent/50",
                          isCurrent && "bg-accent font-medium"
                        )}
                      >
                        <span className="truncate">{refund.name}</span>
                        <Badge variant={REFUND_STATUS[refund.status].variant}>
                          {REFUND_STATUS[refund.status].label}
                        </Badge>
                      </Link>
                    </li>
                  );
                })}
```

Acrescentar `import { cn } from "@/lib/utils";`.

- [ ] **Step 4: Passar a prop na página**

Em `src/pages/PageRefundReview.tsx`, linha 88:

```tsx
      {refund && !isLoading && (
        <RequesterPanel requester={refund.user} viewer={user} currentRefundId={refund.id} />
      )}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/features/refunds/components/RequesterPanel.tsx \
        src/features/refunds/components/RequesterPanel.test.tsx src/pages/PageRefundReview.tsx
git commit -m "feat(review): highlight the current refund in the requester panel"
```

---

### Task 11: Setas de navegação no painel

**Files:**
- Modify: `src/features/refunds/components/RequesterPanel.tsx`
- Modify: `src/features/refunds/components/RequesterPanel.test.tsx`

**Interfaces:**
- Consumes: `currentRefundId` (Task 10); `getRefundHref` (existente).

- [ ] **Step 1: Escrever os testes que falham**

Em `RequesterPanel.test.tsx`, acrescentar uma resposta com três linhas e os testes:

```tsx
// Three refunds so a middle position exists: with two rows every position is
// an edge, and "both arrows enabled" could never be observed.
function threeRefundsResponse() {
  const attributes = [10, 20, 30].map((id, index) => ({
    ...refundFixture,
    id,
    name: `Solicitação ${index + 1}`,
    user: { id: requester.id, name: requester.name, has_avatar: false },
  }));
  return {
    type: "Refund",
    count: attributes.length,
    total: attributes.length,
    sum_amount_in_cents: attributes.reduce((sum, refund) => sum + refund.amount_in_cents, 0),
    page: 1,
    per_page: REFUNDS_PER_PAGE,
    total_pages: 1,
    attributes,
  };
}

describe("RequesterPanel navigation arrows", () => {
  it("links each arrow to the neighbouring refund from the middle of the list", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(threeRefundsResponse())));
    renderPanel(adminViewer, 20);

    expect(
      await screen.findByRole("link", { name: "Solicitação anterior deste solicitante" })
    ).toHaveAttribute("href", "/refunds/10/review");
    expect(
      screen.getByRole("link", { name: "Próxima solicitação deste solicitante" })
    ).toHaveAttribute("href", "/refunds/30/review");
  });

  // At an edge the arrow must be a disabled control, not a link to nowhere and
  // not an absent element — a control that vanishes moves the one next to it.
  it("disables the previous arrow on the first refund", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(threeRefundsResponse())));
    renderPanel(adminViewer, 10);

    expect(
      await screen.findByRole("button", { name: "Solicitação anterior deste solicitante" })
    ).toBeDisabled();
    expect(
      screen.getByRole("link", { name: "Próxima solicitação deste solicitante" })
    ).toBeInTheDocument();
  });

  it("disables the next arrow on the last refund", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(threeRefundsResponse())));
    renderPanel(adminViewer, 30);

    expect(
      await screen.findByRole("button", { name: "Próxima solicitação deste solicitante" })
    ).toBeDisabled();
  });

  // The panel loads only the requester's first page (10 items, no pagination
  // by design). A refund beyond it has no position in this list, so there is
  // no meaningful neighbour in either direction — both arrows go inert rather
  // than silently jumping to the first page's edges.
  it("disables both arrows when the current refund is not in the loaded page", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(threeRefundsResponse())));
    renderPanel(adminViewer, 999);

    expect(
      await screen.findByRole("button", { name: "Solicitação anterior deste solicitante" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Próxima solicitação deste solicitante" })
    ).toBeDisabled();
  });
});
```

Acrescentar `REFUNDS_PER_PAGE` ao import de `@/features/refunds` no teste.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/features/refunds/components/RequesterPanel.test.tsx`
Expected: FAIL — as setas não existem.

- [ ] **Step 3: Implementar**

Em `RequesterPanel.tsx`, acrescentar o cálculo depois dos hooks:

```tsx
  // Posição derivada da lista já carregada — sem estado novo. -1 significa que
  // a solicitação aberta não está nesta página (o painel carrega só a
  // primeira, por decisão do ciclo anterior); nesse caso não há vizinho em
  // nenhuma direção.
  const rows = list?.attributes ?? [];
  const currentIndex = rows.findIndex((refund) => refund.id === currentRefundId);
  const previousRefund = currentIndex > 0 ? rows[currentIndex - 1] : null;
  const nextRefund =
    currentIndex >= 0 && currentIndex < rows.length - 1 ? rows[currentIndex + 1] : null;
```

Um subcomponente no mesmo arquivo, logo antes do `export default`:

```tsx
// Uma seta: link quando há vizinho, botão desabilitado quando não há. Os dois
// estados precisam ocupar o mesmo espaço — uma seta que some desloca a outra.
function NavigationArrow({
  refund,
  viewer,
  label,
  children,
}: {
  refund: Refund | null;
  viewer: RefundViewer | null;
  label: string;
  children: React.ReactNode;
}) {
  if (!refund) {
    return (
      <Button variant="outline" size="icon" aria-label={label} disabled>
        {children}
      </Button>
    );
  }

  return (
    <Button variant="outline" size="icon" aria-label={label} asChild>
      <Link to={getRefundHref(refund, viewer)}>{children}</Link>
    </Button>
  );
}
```

E, no cabeçalho da seção "Solicitações" (substituindo o `<h3>` solto da linha 77):

```tsx
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Solicitações</h3>
            <div className="flex items-center gap-1">
              <NavigationArrow
                refund={previousRefund}
                viewer={viewer}
                label="Solicitação anterior deste solicitante"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </NavigationArrow>
              <NavigationArrow
                refund={nextRefund}
                viewer={viewer}
                label="Próxima solicitação deste solicitante"
              >
                <ChevronRight className="size-4" aria-hidden />
              </NavigationArrow>
            </div>
          </div>
```

Imports novos: `ChevronLeft`, `ChevronRight` de `lucide-react`; `Button` de `@/components/ui/button`; `type Refund` de `../schemas/refund`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/features/refunds/components/RequesterPanel.test.tsx`
Expected: PASS

- [ ] **Step 5: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/features/refunds/components/RequesterPanel.tsx src/features/refunds/components/RequesterPanel.test.tsx
git commit -m "feat(review): add previous/next arrows to the requester panel"
```

---

### Task 12: `useNextPendingRefund` e o botão "Próxima pendente"

**Files:**
- Create: `src/features/refunds/hooks/useNextPendingRefund.ts`
- Create: `src/features/refunds/hooks/useNextPendingRefund.test.tsx`
- Modify: `src/features/refunds/index.ts`
- Modify: `src/pages/PageRefundReview.tsx`
- Modify: `src/pages/PageRefundReview.test.tsx`

**Interfaces:**
- Consumes: `refundListQuery` com `status`/`sort`/`order` (Task 1); `RefundViewer`.
- Produces: `useNextPendingRefund(currentRefundId: number, viewer: RefundViewer | null): { nextRefund: Refund | null; isLoading: boolean }`.

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/features/refunds/hooks/useNextPendingRefund.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { refundFixture } from "@/test/msw/handlers";
import { QueryWrapper } from "@/test/utils";
import type { RefundViewer } from "../lib/getRefundHref";
import { useNextPendingRefund } from "./useNextPendingRefund";

const admin: RefundViewer = { id: 99, role: "admin" };

function pendingListResponse(
  entries: Array<{ id: number; userId: number }>
) {
  const attributes = entries.map(({ id, userId }) => ({
    ...refundFixture,
    id,
    status: "pending",
    user: { id: userId, name: `Pessoa ${userId}`, has_avatar: false },
  }));
  return {
    type: "Refund",
    count: attributes.length,
    total: attributes.length,
    sum_amount_in_cents: attributes.reduce((sum, refund) => sum + refund.amount_in_cents, 0),
    page: 1,
    per_page: 10,
    total_pages: 1,
    attributes,
  };
}

function renderNextPending(currentRefundId: number, viewer: RefundViewer | null = admin) {
  return renderHook(() => useNextPendingRefund(currentRefundId, viewer), {
    wrapper: QueryWrapper,
  });
}

describe("useNextPendingRefund", () => {
  // The queue must be requested oldest-first and restricted to pending. This
  // asserts what was FETCHED, not what was returned: a hook that fetched the
  // whole list and picked the first pending row would produce the same value
  // here while paging through everyone's refunds.
  it("asks the API for the oldest pending refunds", async () => {
    let captured: URLSearchParams | null = null;
    server.use(
      http.get("*/refunds", ({ request }) => {
        captured = new URL(request.url).searchParams;
        return HttpResponse.json(pendingListResponse([{ id: 1, userId: 1 }]));
      })
    );

    renderNextPending(999);

    await waitFor(() => expect(captured).not.toBeNull());
    expect(captured!.get("status")).toBe("pending");
    expect(captured!.get("sort")).toBe("created_at");
    expect(captured!.get("order")).toBe("asc");
  });

  it("returns the oldest pending refund", async () => {
    server.use(
      http.get("*/refunds", () =>
        HttpResponse.json(pendingListResponse([{ id: 7, userId: 1 }, { id: 8, userId: 2 }]))
      )
    );

    const { result } = renderNextPending(999);

    await waitFor(() => expect(result.current.nextRefund?.id).toBe(7));
  });

  // "Next" must mean a different refund. Without this the button would point
  // at the screen the admin is already on.
  it("skips the refund currently open", async () => {
    server.use(
      http.get("*/refunds", () =>
        HttpResponse.json(pendingListResponse([{ id: 7, userId: 1 }, { id: 8, userId: 2 }]))
      )
    );

    const { result } = renderNextPending(7);

    await waitFor(() => expect(result.current.nextRefund?.id).toBe(8));
  });

  // BR-016: an admin may not review their own refund, and reviewLoader
  // redirects away from it. A button that lands on a redirect is a broken
  // promise, so the admin's own refunds are skipped here.
  it("skips the admin's own refunds", async () => {
    server.use(
      http.get("*/refunds", () =>
        HttpResponse.json(pendingListResponse([{ id: 7, userId: admin.id }, { id: 8, userId: 2 }]))
      )
    );

    const { result } = renderNextPending(999);

    await waitFor(() => expect(result.current.nextRefund?.id).toBe(8));
  });

  it("returns nothing when no pending refund is eligible", async () => {
    server.use(
      http.get("*/refunds", () => HttpResponse.json(pendingListResponse([{ id: 7, userId: admin.id }])))
    );

    const { result } = renderNextPending(999);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.nextRefund).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/features/refunds/hooks/useNextPendingRefund.test.tsx`
Expected: FAIL — `Failed to resolve import "./useNextPendingRefund"`.

- [ ] **Step 3: Implementar o hook**

Criar `src/features/refunds/hooks/useNextPendingRefund.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { refundListQuery } from "../api/refundQueries";
import { REFUNDS_PER_PAGE } from "../constants/pagination";
import type { RefundViewer } from "../lib/getRefundHref";
import type { Refund } from "../schemas/refund";

// A fila de trabalho do admin: a pendente MAIS ANTIGA primeiro. O padrão da
// API é `created_at desc`, que numa fila faria as solicitações velhas nunca
// saírem — daí o `order: "asc"` explícito.
//
// Limitação consciente: só a primeira página é consultada. Se as 10 pendentes
// mais antigas forem todas do próprio admin, o botão desabilita mesmo havendo
// outras adiante. Varrer páginas até achar custa mais do que o caso raro vale.
export function useNextPendingRefund(currentRefundId: number, viewer: RefundViewer | null) {
  const isAdmin = viewer?.role === "admin";

  const { data, isLoading } = useQuery({
    ...refundListQuery({
      page: 1,
      perPage: REFUNDS_PER_PAGE,
      status: "pending",
      sort: "created_at",
      order: "asc",
    }),
    enabled: isAdmin,
  });

  // Duas exclusões, por motivos diferentes: a atual porque "próxima" precisa
  // ser outra tela, e as do próprio admin por BR-016 — o reviewLoader
  // redirecionaria, e o botão teria prometido algo que não entrega.
  const nextRefund: Refund | null =
    data?.attributes.find(
      (refund) => refund.id !== currentRefundId && refund.user.id !== viewer?.id
    ) ?? null;

  return { nextRefund, isLoading: isAdmin && isLoading };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/features/refunds/hooks/useNextPendingRefund.test.tsx`
Expected: PASS (5 testes)

- [ ] **Step 5: Exportar pela fachada**

Em `src/features/refunds/index.ts`:

```ts
// A próxima solicitação pendente revisável, para a navegação em fila da tela
// de revisão. Pula a solicitação aberta e as do próprio admin (BR-016).
export { useNextPendingRefund } from "./hooks/useNextPendingRefund";
```

- [ ] **Step 6: Escrever o teste da página que falha**

Em `src/pages/PageRefundReview.test.tsx`:

```tsx
describe("PageRefundReview pending queue", () => {
  it("links the queue button to the next eligible pending refund", async () => {
    // A pending list whose first entry is a different refund from a different
    // person — the one the button must land on.
    server.use(
      http.get("*/refunds", () =>
        HttpResponse.json({
          type: "Refund",
          count: 1,
          total: 1,
          sum_amount_in_cents: 4500,
          page: 1,
          per_page: 10,
          total_pages: 1,
          attributes: [
            { ...refundFixture, id: 42, status: "pending", user: { id: 3, name: "Carla", has_avatar: false } },
          ],
        })
      )
    );

    renderReviewPage();

    expect(await screen.findByRole("link", { name: "Próxima pendente" })).toHaveAttribute(
      "href",
      "/refunds/42/review"
    );
  });

  // Disabled, not absent: a button that disappears leaves the admin unable to
  // tell "the queue is empty" from "the screen is broken".
  it("disables the queue button when the queue has nothing eligible", async () => {
    server.use(
      http.get("*/refunds", () =>
        HttpResponse.json({
          type: "Refund",
          count: 0,
          total: 0,
          sum_amount_in_cents: 0,
          page: 1,
          per_page: 10,
          total_pages: 0,
          attributes: [],
        })
      )
    );

    renderReviewPage();

    expect(await screen.findByRole("button", { name: "Próxima pendente" })).toBeDisabled();
  });
});
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `npx vitest run src/pages/PageRefundReview.test.tsx`
Expected: FAIL — o botão não existe.

- [ ] **Step 8: Montar o botão na página**

Em `src/pages/PageRefundReview.tsx`, acrescentar ao import de `@/features/refunds` o `useNextPendingRefund`, e:

```tsx
  const { nextRefund } = useNextPendingRefund(refund?.id ?? 0, user);
```

E, como primeiro filho do `<div>` externo (antes do `<Card>`). A guarda `refund &&` importa: enquanto o reembolso atual não carregou, `currentRefundId` é `0`, e o hook não teria como excluir a solicitação aberta — o botão apontaria brevemente para a própria tela:

```tsx
      {refund && (
      <div className="flex justify-end">
        {nextRefund ? (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/refunds/${nextRefund.id}/review`}>
              Próxima pendente
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Próxima pendente
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>
      )}
```

Imports novos: `Link` de `react-router`, `Button` de `@/components/ui/button`, `ArrowRight` de `lucide-react`.

O destino é escrito direto, não por `getRefundHref`: o hook **já** garantiu que o reembolso não é do admin, então a condição da função seria uma segunda checagem do mesmo fato.

- [ ] **Step 9: Rodar e ver passar**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 10: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/features/refunds/hooks/useNextPendingRefund.ts \
        src/features/refunds/hooks/useNextPendingRefund.test.tsx \
        src/features/refunds/index.ts src/pages/PageRefundReview.tsx src/pages/PageRefundReview.test.tsx
git commit -m "feat(review): add a next-pending queue button to the review screen"
```

---

### Task 13: Fechamento — verificação, documentação e checklist de navegador

**Files:**
- Modify: `../Refund-api/docs/plans/current-state.md`
- Modify: `../Refund-api/docs/learning-path-progress.md`
- Create: nada

- [ ] **Step 1: Rodar a verificação completa três vezes**

```bash
npx vitest run && npx vitest run && npx vitest run
npx tsc -b --noEmit
npm run lint
npm run build
```

Três rodadas por causa do flake conhecido: `ResizeObserver is not defined` em `Sidebar.test.tsx`, dependente da ordem de execução, observado em pelo menos duas ocasiões e nunca reproduzível isoladamente. Se aparecer, **registre a saída completa** — é a primeira vez que teríamos o rastro inteiro.

Registrar: número de testes, número de arquivos, e o tamanho do bundle. O aviso de chunk > 500 kB é **pré-existente** (518,36 kB no fim do ciclo anterior); a diferença atribuível a este ciclo é o `@tanstack/react-table` mais o código novo.

- [ ] **Step 2: Medir overflow real no mobile**

Com `npm run dev` e o DevTools em iPhone 12 Pro (390 × 844), no console:

```js
document.documentElement.scrollWidth > document.documentElement.clientWidth
```

Expected: `false` na Home (com e sem filtro), no detalhe e na tela de revisão. Screenshot não serve — o `AGENTS.md` é explícito quanto a isso.

- [ ] **Step 3: Checklist de validação no navegador**

Contra a API real (backend em `localhost:3333`), com um admin e um usuário comum. Marcar item a item — o ciclo anterior foi validado sem essa granularidade e ficou registrado como lacuna:

- [ ] Tabela na Home mostra solicitante e data para o admin
- [ ] Coluna solicitante **ausente** para usuário comum
- [ ] Ordenar por Valor, Data, Título e Status muda a URL **e** a primeira linha
- [ ] Ordenar estando na página 2 volta para a página 1
- [ ] Filtrar por status muda a lista, os cards de resumo e a URL
- [ ] Rótulo do card do admin acompanha o filtro e volta a "Solicitado" em Todos
- [ ] Recarregar com `?sort=name&order=asc` preserva a visão
- [ ] URL com `?sort=inexistente` é normalizada em vez de quebrar a tela
- [ ] Em 390px a tabela não gera scroll horizontal
- [ ] Tela de revisão mostra o comprovante da despesa
- [ ] Reembolso pago mostra os **dois** comprovantes
- [ ] Card Total no painel bate com a soma dos quatro
- [ ] Linha da solicitação aberta destacada no painel
- [ ] Setas do painel andam entre as solicitações e desabilitam nas pontas
- [ ] "Próxima pendente" leva a uma pendente de outra pessoa
- [ ] "Próxima pendente" desabilitado quando não há fila

- [ ] **Step 4: Atualizar a documentação canônica**

Em `../Refund-api/docs/plans/current-state.md`:
- Acrescentar o ciclo à seção de progresso, com os números de verificação.
- **Remover** do backlog do frontend o item 1 (TanStack Table) — o Item 13 fecha aqui.
- Acrescentar às pendências: a limitação de primeira página do "Próxima pendente"; as setas do painel inertes fora dos 10; solicitante e data escondidos no mobile; `category`/`user` não ordenáveis porque a API não os aceita.
- Marcar como resolvida a dívida do `per_page: 10` literal nos testes.

Em `../Refund-api/docs/learning-path-progress.md`: entrada do Item 13 com o que foi aprendido — em especial `manualSorting` e o motivo de a ordenação viver na URL.

- [ ] **Step 5: Commitar a documentação**

```bash
cd ../Refund-api
git add docs/plans/current-state.md docs/learning-path-progress.md
git commit -m "docs: record the review navigation and refund table cycle"
```

- [ ] **Step 6: Revisão da branch inteira**

Antes do merge, revisar a branch completa — não só task a task. A revisão por task não enxerga interações entre tasks, e foi exatamente ela que deixou passar três problemas no ciclo de backend de 2026-07-30. Pontos a conferir por busca, não por leitura de intenção:

- Nenhum ponto do código ordena ou filtra reembolsos no cliente (`grep -rn "\.sort(\|\.filter(" src/features/refunds src/pages`, conferindo cada ocorrência).
- Nenhuma chave de cache nova colide: os parâmetros de listagem entram no hash de `refundKeys.list`, e a query da fila de pendentes tem parâmetros distintos dos da Home.
- `getRefundHref` continua com um único call site por lista — nenhuma cópia inline do `role === "admin" && …`.
- A ordem das colunas ordenáveis (`column.id`) bate exatamente com a lista branca de `sort` do `refundSortSchema`.

---

## Self-Review

**Cobertura da spec:** §1 Parâmetros → Task 1. §2 Tabela → Tasks 2-3. §3 Toolbar/ordenação → Tasks 5-6. §4 Rótulo do card → Task 7. §5 Comprovante da despesa → Task 8. §6 Card Total → Task 9. §7 Destaque → Task 10. §8 Setas → Task 11. §9 Próxima pendente → Task 12. Testes e Verificação da spec → distribuídos nas tasks e consolidados na Task 13. Responsivo → Task 4 (implementação) e Task 13 Step 2 (medição).

**Consistência de tipos:** `RefundSort`/`RefundOrder` definidos na Task 1 e usados nas Tasks 5 e 12 com os mesmos nomes. `currentRefundId` introduzido na Task 10 e consumido na Task 11. `RefundsTable` recebe props em três etapas (Tasks 3, 4, 5) — a Task 5 traz o helper de teste atualizado para não deixar chamadas antigas quebradas. `useNextPendingRefund` devolve `{ nextRefund, isLoading }` na Task 12 e é consumido com essa forma na mesma task.
