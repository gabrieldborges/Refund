# Contrato novo e comprovante autenticado — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o `Refund-FrontEnd` consumir o contrato novo da API e buscar o comprovante por rota autenticada, sem adicionar funcionalidade além disso.

**Architecture:** Os schemas Zod absorvem a forma nova do reembolso (`user` aninhado, `status`, sem `filename`) e da sessão. O comprovante passa a ser um `Blob` cacheado pelo TanStack Query, convertido em object URL por um hook da camada `shared` cujo ciclo de vida pertence ao componente que renderiza.

**Tech Stack:** React 19, TypeScript, Vite, Zod 4, TanStack Query 5, React Router 7, Vitest + Testing Library + MSW 2, Tailwind 4 + shadcn/ui.

**Spec:** [`../specs/2026-07-29-frontend-contract-and-receipt-design.md`](../specs/2026-07-29-frontend-contract-and-receipt-design.md)

## Global Constraints

- Branch de trabalho: `feat/frontend-contract-and-receipt` (já criada, com o commit da spec).
- Textos de UI em **português**; código, identificadores e comentários de teste em **inglês** (`AGENTS.md`).
- Depois de qualquer mudança: `npx tsc -b --noEmit`.
- Régua de lint: **0 erros, 0 warnings**. Não regredir.
- Imports entre camadas passam pelo `eslint-plugin-boundaries`: `app` só alcança uma feature pela fachada `index.ts`; `shared` (`src/lib`, `src/hooks`, `src/stores`) não importa de `feature` nem de `app`.
- Componentes de UI novos vêm do registry shadcn; só escrever à mão quando não houver equivalente.
- Nenhuma dependência nova é adicionada neste ciclo.
- Commits pequenos, um por task, em português no corpo quando ajudar.

## Estrutura de arquivos

**Criar**

| Arquivo | Responsabilidade |
| --- | --- |
| `src/hooks/useObjectUrl.ts` | Converte `Blob` em object URL e revoga no cleanup. Camada `shared`, genérico, reusado pelo ciclo da foto de perfil. |
| `src/hooks/useObjectUrl.test.ts` | Prova criação e **revogação**. |
| `src/features/refunds/constants/status.ts` | Rótulo PT + variante de badge por status. |
| `src/features/refunds/constants/pagination.ts` | `REFUNDS_PER_PAGE`, fonte única. |
| `src/features/refunds/hooks/useReceipt.ts` | Hook do comprovante, espelhando `useRefund`. |
| `src/features/refunds/components/ReceiptPreview.tsx` | Preview embutido + tela cheia; decide imagem vs PDF. |
| `src/features/refunds/components/ReceiptPreview.test.tsx` | Imagem, PDF e erro. |
| `src/context/AuthContext.test.tsx` | Sessão persistida válida e inválida. |

**Modificar**

| Arquivo | Mudança |
| --- | --- |
| `src/features/refunds/schemas/refund.ts` | Forma nova; remove `refundBaseSchema` e `refundCreateResponseSchema`. |
| `src/features/refunds/schemas/refund.test.ts` | Testes da forma nova. |
| `src/features/refunds/api/refundQueries.ts` | `refundKeys.receipt`, `receiptQuery`, rename do schema de resposta. |
| `src/features/refunds/hooks/useCreateRefund.ts` | Usa `refundResponseSchema`. |
| `src/features/refunds/hooks/useRefunds.ts` | Default vem de `REFUNDS_PER_PAGE`. |
| `src/features/refunds/index.ts` | Exporta `REFUNDS_PER_PAGE`, `REFUND_STATUS`, `ReceiptPreview`. |
| `src/schemas/auth.ts` | `id` no login; `storedUserSchema`. |
| `src/context/auth-context.ts` | `AuthUser.id`. |
| `src/context/AuthContext.tsx` | `safeParse` da sessão; grava `id`. |
| `src/lib/api.ts` | Remove `getReceiptUrl`. |
| `src/router-loaders.ts` | Importa `REFUNDS_PER_PAGE` da fachada. |
| `src/pages/PageHome.tsx` | Badge de status na linha. |
| `src/pages/PageRefundDetails.tsx` | `ReceiptPreview` + badge. |
| `src/pages/PageHome.test.tsx` | Corrige a asserção vazia; `per_page` 10. |
| `src/pages/PageRefundDetails.test.tsx` | Sem link de comprovante; depois, com preview. |
| `src/components/core/MainLayout.test.tsx` | `user` de teste ganha `id`. |
| `src/components/core/Sidebar.test.tsx` | `user` de teste ganha `id`. |
| `src/test/msw/handlers.ts` | Fixtures na forma nova + handler binário do comprovante. |
| `src/test/setup.ts` | Stub de `URL.createObjectURL` / `revokeObjectURL`. |

---

### Task 1: Fast-forward do backend

Antes de tocar no frontend, a `main` do `Refund-api` precisa ser o contrato único. Sem isso o desenvolvimento roda contra uma API que ainda devolve `user_id`, e todo teste manual mente.

**Files:**
- Nenhum arquivo editado. Operação de Git no repositório `../Refund-api`.

**Interfaces:**
- Consumes: nada.
- Produces: `main` do `Refund-api` servindo `user` aninhado, `status`, `GET /refunds/{id}/receipt` e `GET /users/{id}/avatar`.

- [ ] **Step 1: Confirmar que o fast-forward é possível**

```bash
cd ../Refund-api
git checkout main
git merge-base --is-ancestor main feat/authenticated-file-serving && echo "FF OK"
```

Esperado: imprime `FF OK`. Se não imprimir, **pare** e reporte — significa que a `main` andou e o merge deixou de ser trivial.

- [ ] **Step 2: Mesclar**

```bash
git merge --ff-only feat/authenticated-file-serving
git log --oneline -1
```

Esperado: HEAD em `ef7c60f docs: hand the frontend backlog to the next session`.

- [ ] **Step 3: Verificar a suíte do backend**

```bash
pytest
pylint src
```

Esperado: **178 testes verdes** e **10.00/10**. Qualquer desvio: pare e reporte antes de seguir.

- [ ] **Step 4: Aplicar as migrations no banco de desenvolvimento**

```bash
alembic upgrade head
```

Esperado: aplica `bc9699597a1c_add_user_avatar`. A migration de status já estava na `main`.

- [ ] **Step 5: Confirmar o contrato novo com a API rodando**

Suba a API (`localhost:3333`), faça login e chame a listagem com o token. Confirme na resposta: `user` aninhado com `has_avatar`, `status` presente, e **ausência** de `user_id` no topo e de `filename`.

Sem commit nesta task — o merge já é o registro.

---

### Task 2: Contrato do reembolso nos schemas

Schema, fixtures e consumidores diretos mudam **juntos**: separá-los deixaria o `tsc` vermelho no fim da task.

> **Regressão temporária, deliberada:** esta task remove o link "Abrir comprovante" do detalhe, porque ele depende de `refund.filename`, que deixou de existir. O preview volta na Task 8. Não é esquecimento.

**Files:**
- Modify: `src/features/refunds/schemas/refund.ts`
- Modify: `src/features/refunds/schemas/refund.test.ts`
- Modify: `src/features/refunds/api/refundQueries.ts`
- Modify: `src/features/refunds/hooks/useCreateRefund.ts`
- Modify: `src/test/msw/handlers.ts`
- Modify: `src/pages/PageRefundDetails.tsx`
- Modify: `src/pages/PageRefundDetails.test.tsx`

**Interfaces:**
- Consumes: contrato da Task 1.
- Produces: `refundSchema`, `refundStatusSchema`, `refundResponseSchema`, `refundsListResponseSchema`, tipos `Refund` e `RefundStatus`. `refundBaseSchema` e `refundCreateResponseSchema` **deixam de existir**.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao fim de `src/features/refunds/schemas/refund.test.ts`:

```ts
import { refundSchema } from "./refund";

const validRefund = {
  id: 1,
  name: "Almoço com cliente",
  category: "food",
  amount_in_cents: 4500,
  status: "pending",
  created_at: "2026-07-20T12:00:00.000Z",
  user: { id: 13, name: "Gabriel", has_avatar: false },
};

describe("refundSchema", () => {
  // The nested requester replaced the flat user_id: a payload in the new shape
  // must parse, keeping user.id reachable.
  it("accepts the nested user shape", () => {
    const result = refundSchema.safeParse(validRefund);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user.id).toBe(13);
    }
  });

  // The old flat shape must be rejected rather than silently accepted: this is
  // the assertion that would have caught the breaking change in CI.
  it("rejects the old flat shape", () => {
    const { user, ...withoutUser } = validRefund;
    void user;
    expect(refundSchema.safeParse({ ...withoutUser, user_id: 13 }).success).toBe(false);
  });

  // status is part of the contract now, and only the three known values pass.
  it("rejects an unknown status", () => {
    expect(refundSchema.safeParse({ ...validRefund, status: "cancelled" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run src/features/refunds/schemas/refund.test.ts
```

Esperado: FAIL — `refundSchema` ainda exige `user_id` e `filename`, e não conhece `status`.

- [ ] **Step 3: Reescrever o schema**

Substituir, em `src/features/refunds/schemas/refund.ts`, tudo entre `const refundBaseSchema` e `refundCreateResponseSchema` por:

```ts
const refundUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  // O cliente só precisa saber se mostra foto ou o gradiente padrão; a imagem
  // vem de GET /users/{id}/avatar, não deste campo.
  has_avatar: z.boolean(),
});

export const refundStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const refundSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  category: z.enum(CATEGORY_VALUES),
  amount_in_cents: z.number().int().positive(),
  status: refundStatusSchema,
  created_at: z.string().nullable(),
  user: refundUserSchema,
});

export const refundsListResponseSchema = z.object({
  type: z.literal("Refund"),
  count: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  sum_amount_in_cents: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  per_page: z.number().int().min(1).max(100),
  total_pages: z.number().int().nonnegative(),
  attributes: z.array(refundSchema),
});

// Um envelope só para detalhe E criação. Até este ciclo a criação tinha
// contrato próprio, porque a API não devolvia `created_at`; ela passou a reler
// a linha gravada e as três respostas ficaram idênticas. Quando o backend
// remove uma divergência, o frontend remove a compensação.
export const refundResponseSchema = z.object({
  type: z.literal("Refund"),
  count: z.literal(1),
  attributes: refundSchema,
});
```

Ajustar os tipos derivados ao fim do arquivo:

```ts
export type Refund = z.output<typeof refundSchema>;
export type RefundStatus = z.output<typeof refundStatusSchema>;
export type RefundsListResponse = z.output<typeof refundsListResponseSchema>;
```

- [ ] **Step 4: Atualizar os consumidores diretos**

`src/features/refunds/api/refundQueries.ts` — trocar o import e o uso:

```ts
import { refundResponseSchema, refundsListResponseSchema } from "../schemas/refund";
```

```ts
      return refundResponseSchema.parse(data).attributes;
```

`src/features/refunds/hooks/useCreateRefund.ts` — trocar import e uso:

```ts
import { refundResponseSchema, type RefundCreateFormData } from "../schemas/refund";
```

```ts
      return refundResponseSchema.parse(responseData).attributes;
```

- [ ] **Step 5: Atualizar as fixtures do MSW**

Em `src/test/msw/handlers.ts`, substituir `refundFixture` e o handler de criação:

```ts
// A full Refund as returned by list, detail and create — the three share one
// shape now, so there is a single fixture.
export const refundFixture = {
  id: 1,
  name: "Almoço com cliente",
  category: "food",
  amount_in_cents: 4500,
  status: "pending",
  created_at: "2026-07-20T12:00:00.000Z",
  user: { id: 1, name: "Ana Souza", has_avatar: false },
};
```

```ts
  // Refund creation: same shape as detail, since the API re-reads the row.
  http.post("*/refunds", () => {
    return HttpResponse.json({ type: "Refund", count: 1, attributes: refundFixture }, { status: 201 });
  }),
```

- [ ] **Step 6: Remover o link de comprovante do detalhe**

Em `src/pages/PageRefundDetails.tsx`, apagar o bloco `<a href={getReceiptUrl(refund.filename)}>…</a>` inteiro e o import de `Receipt` do `lucide-react`. Manter `getApiErrorMessage` no import de `@/lib/api`:

```ts
import { getApiErrorMessage } from "@/lib/api";
```

Em `src/pages/PageRefundDetails.test.tsx`, apagar do primeiro teste as três linhas do `expect(screen.getByRole("link", { name: "Abrir comprovante" }))…`.

- [ ] **Step 7: Rodar a suíte inteira**

```bash
npm run test
npx tsc -b --noEmit
```

Esperado: **todos verdes**, exit 0. Se algum teste ainda referenciar `refundFixture.filename` ou `user_id`, corrija a referência — a quebra é o Item 5 fazendo seu trabalho.

- [ ] **Step 8: Commit**

```bash
git add src/features/refunds src/test/msw/handlers.ts src/pages/PageRefundDetails.tsx src/pages/PageRefundDetails.test.tsx
git commit -m "feat: absorb the nested user and status refund contract"
```

---

### Task 3: `id` no login e sessão persistida validada

**Files:**
- Modify: `src/schemas/auth.ts`
- Modify: `src/context/auth-context.ts`
- Modify: `src/context/AuthContext.tsx`
- Create: `src/context/AuthContext.test.tsx`
- Modify: `src/test/msw/handlers.ts`
- Modify: `src/components/core/MainLayout.test.tsx`
- Modify: `src/components/core/Sidebar.test.tsx`

**Interfaces:**
- Consumes: nada da Task 2.
- Produces: `AuthUser = { id: number; name: string; email: string; role: "standard" | "admin" }`; `storedUserSchema` em `src/schemas/auth.ts`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/context/AuthContext.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";
import { USER_STORAGE_KEY } from "@/lib/api";

// Reads the session out of the context so the assertions can be made on
// rendered text instead of on internal state.
function SessionProbe() {
  const { user, isAuthenticated } = useAuth();
  return <p>{isAuthenticated ? `logged:${user?.id}` : "anonymous"}</p>;
}

function renderProbe() {
  return render(
    <AuthProvider>
      <SessionProbe />
    </AuthProvider>
  );
}

describe("AuthProvider stored session", () => {
  // A session persisted in the new shape is restored on boot.
  it("restores a valid stored session", () => {
    localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({ id: 7, name: "Ana", email: "ana@exemplo.com", role: "standard" })
    );

    renderProbe();

    expect(screen.getByText("logged:7")).toBeInTheDocument();
  });

  // A session persisted before `id` existed no longer satisfies the schema, so
  // the app must boot logged out rather than carrying a half-valid user.
  it("discards a stored session missing id", () => {
    localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({ name: "Ana", email: "ana@exemplo.com", role: "standard" })
    );

    renderProbe();

    expect(screen.getByText("anonymous")).toBeInTheDocument();
  });

  // Corrupted JSON must not throw during the initial render.
  it("discards a corrupted stored session", () => {
    localStorage.setItem(USER_STORAGE_KEY, "{not json");

    renderProbe();

    expect(screen.getByText("anonymous")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run src/context/AuthContext.test.tsx
```

Esperado: FAIL. O primeiro teste falha porque `id` não existe; o terceiro estoura com `SyntaxError` do `JSON.parse`.

- [ ] **Step 3: Estender os schemas de auth**

Em `src/schemas/auth.ts`:

```ts
import { z } from "zod";

const roleSchema = z.enum(["standard", "admin"]);

export const loginResponseSchema = z.object({
  access: z.literal(true),
  id: z.number().int().positive(),
  name: z.string(),
  email: z.string().email(),
  role: roleSchema,
  token: z.string().min(1),
});

// A sessão gravada no localStorage também é uma fronteira: até aqui ela era
// lida com type assertion, que não valida nada. O Item 2 cobriu só respostas
// HTTP; esta é a metade que faltava.
export const storedUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  email: z.string().email(),
  role: roleSchema,
});

export type LoginResponse = z.output<typeof loginResponseSchema>;
```

> `avatar_filename` fica fora de propósito: o Zod descarta chaves desconhecidas e, sem renderizar avatar neste ciclo, o campo não tem consumidor.

- [ ] **Step 4: Adicionar `id` ao `AuthUser`**

Em `src/context/auth-context.ts`:

```ts
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "standard" | "admin";
}
```

- [ ] **Step 5: Validar a sessão e gravar o `id`**

Em `src/context/AuthContext.tsx`:

```ts
import { loginResponseSchema, storedUserSchema } from "../schemas/auth";
```

```ts
// safeParse em vez de parse: uma sessão inválida (de antes do `id`, ou
// corrompida) deve derrubar a sessão, não a aplicação inteira no primeiro
// render.
function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    const result = storedUserSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    // JSON.parse joga em texto corrompido; o safeParse nunca chegaria a rodar.
    return null;
  }
}
```

E no `login`, incluir o `id`:

```ts
    const loggedUser: AuthUser = {
      id: loginResponse.id,
      name: loginResponse.name,
      email: loginResponse.email,
      role: loginResponse.role,
    };
```

- [ ] **Step 6: Atualizar fixtures e usuários de teste**

Em `src/test/msw/handlers.ts`, adicionar `id` ao `loginFixture`:

```ts
export const loginFixture = {
  access: true,
  id: 1,
  name: "Ana Souza",
  email: "ana@exemplo.com",
  role: "standard",
  token: "fake-jwt-token",
};
```

Em `src/components/core/MainLayout.test.tsx:29` e `src/components/core/Sidebar.test.tsx:20`, acrescentar `id: 1` ao objeto `user`:

```ts
          user: { id: 1, name: "Gabriel Dantas", email: "gabriel@x.com", role: "standard" },
```

- [ ] **Step 7: Rodar tudo**

```bash
npm run test
npx tsc -b --noEmit
```

Esperado: verdes, exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/schemas/auth.ts src/context src/test/msw/handlers.ts src/components/core
git commit -m "feat: carry the user id and validate the persisted session"
```

---

### Task 4: `REFUNDS_PER_PAGE` com fonte única

Hoje o número está escrito em dois arquivos que podem divergir em silêncio.

**Files:**
- Create: `src/features/refunds/constants/pagination.ts`
- Modify: `src/features/refunds/index.ts`
- Modify: `src/features/refunds/hooks/useRefunds.ts`
- Modify: `src/router-loaders.ts`
- Modify: `src/pages/PageHome.test.tsx`

**Interfaces:**
- Produces: `REFUNDS_PER_PAGE = 10`, exportado pela fachada `@/features/refunds`.

- [ ] **Step 1: Criar a constante**

`src/features/refunds/constants/pagination.ts`:

```ts
// Quantos itens a listagem mostra por página. Vive na feature porque é uma
// decisão de apresentação dos reembolsos, e é exportada pela fachada porque o
// router-loaders (camada app) precisa dela — o Item 9 proíbe alcançar o
// interior de uma feature.
export const REFUNDS_PER_PAGE = 10;
```

- [ ] **Step 2: Exportar pela fachada**

Em `src/features/refunds/index.ts`, junto das outras constantes de domínio:

```ts
export { REFUNDS_PER_PAGE } from "./constants/pagination";
```

- [ ] **Step 3: Consumir nos dois lugares**

`src/features/refunds/hooks/useRefunds.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { refundListQuery } from "../api/refundQueries";
import { REFUNDS_PER_PAGE } from "../constants/pagination";

interface UseRefundsParams {
  page: number;
  perPage?: number;
  name?: string;
}

// O default vem da constante compartilhada com o loader: até este ciclo o
// número estava escrito nos dois lugares, e mudar só um deixava loader e hook
// pedindo páginas de tamanhos diferentes.
export function useRefunds({ page, perPage = REFUNDS_PER_PAGE, name }: UseRefundsParams) {
  return useQuery(refundListQuery({ page, perPage, name }));
}
```

`src/router-loaders.ts` — apagar a linha `const REFUNDS_PER_PAGE = 6;` e incluir na importação da fachada:

```ts
import {
  REFUNDS_PER_PAGE,
  refundDetailQuery,
  refundListQuery,
  refundListSearchParamsSchema,
} from "@/features/refunds";
```

- [ ] **Step 4: Alinhar as fixtures do teste da Home**

Em `src/pages/PageHome.test.tsx`, dentro de `pagedListResponse()`, trocar `count: 6` por `count: 10`, `per_page: 6` por `per_page: 10`, `total_pages: 4` por `total_pages: 3`, e `length: 6` por `length: 10` no `Array.from`. Manter `total: 24` e `sum_amount_in_cents: 418200` — o ponto do teste é que os totais vêm da API, não das linhas visíveis. Em `renderPageHome()`, trocar `perPage: 6` por `perPage: 10` no loader.

- [ ] **Step 5: Rodar e verificar**

```bash
npm run test
npx tsc -b --noEmit
npm run lint
```

Esperado: verdes, exit 0, **0 erros e 0 warnings** no lint. O lint importa aqui: se `router-loaders.ts` tivesse importado de um caminho interno da feature, a regra de boundaries acusaria.

- [ ] **Step 6: Commit**

```bash
git add src/features/refunds src/router-loaders.ts src/pages/PageHome.test.tsx
git commit -m "refactor: give the page size a single source of truth"
```

---

### Task 5: `useObjectUrl` e o polyfill de jsdom

**Files:**
- Modify: `src/test/setup.ts`
- Create: `src/hooks/useObjectUrl.ts`
- Create: `src/hooks/useObjectUrl.test.ts`

**Interfaces:**
- Produces: `useObjectUrl(blob: Blob | undefined): string | null`.

- [ ] **Step 1: Adicionar o stub de jsdom**

O jsdom não implementa `URL.createObjectURL` nem `URL.revokeObjectURL`. Em `src/test/setup.ts`, depois do bloco de Pointer Capture:

```ts
// jsdom implements neither createObjectURL nor revokeObjectURL. The receipt
// preview turns a Blob into an object URL, so without these stubs every test
// touching it throws. The counter makes each URL unique, which is what lets a
// test assert that the exact URL it received was the one revoked.
if (!URL.createObjectURL) {
  let objectUrlCount = 0;
  URL.createObjectURL = () => `blob:mock/${++objectUrlCount}`;
  URL.revokeObjectURL = () => {};
}
```

- [ ] **Step 2: Escrever o teste que falha**

Criar `src/hooks/useObjectUrl.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useObjectUrl } from "./useObjectUrl";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useObjectUrl", () => {
  // Without a blob there is nothing to point at, and null is distinguishable
  // from a real URL by the caller.
  it("returns null when there is no blob", () => {
    const { result } = renderHook(() => useObjectUrl(undefined));

    expect(result.current).toBeNull();
  });

  // The happy path: a blob produces a URL built from that exact blob.
  it("creates an object URL for the blob", () => {
    const createSpy = vi.spyOn(URL, "createObjectURL");
    const blob = new Blob(["x"], { type: "image/png" });

    const { result } = renderHook(() => useObjectUrl(blob));

    expect(result.current).toMatch(/^blob:/);
    expect(createSpy).toHaveBeenCalledWith(blob);
  });

  // The reason this hook exists: an object URL is a resource that leaks unless
  // it is revoked. Unmounting must release the exact URL that was handed out.
  it("revokes the URL on unmount", () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    const blob = new Blob(["x"], { type: "image/png" });

    const { result, unmount } = renderHook(() => useObjectUrl(blob));
    const created = result.current;
    unmount();

    expect(revokeSpy).toHaveBeenCalledWith(created);
  });

  // Replacing the blob must release the previous URL, not just the last one at
  // unmount — otherwise every swap leaks one URL.
  it("revokes the previous URL when the blob changes", () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    const first = new Blob(["a"], { type: "image/png" });
    const second = new Blob(["b"], { type: "image/png" });

    const { result, rerender } = renderHook(({ blob }) => useObjectUrl(blob), {
      initialProps: { blob: first },
    });
    const firstUrl = result.current;
    rerender({ blob: second });

    expect(revokeSpy).toHaveBeenCalledWith(firstUrl);
    expect(result.current).not.toBe(firstUrl);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
npx vitest run src/hooks/useObjectUrl.test.ts
```

Esperado: FAIL — `Cannot find module './useObjectUrl'`.

- [ ] **Step 4: Implementar o hook**

Criar `src/hooks/useObjectUrl.ts`:

```ts
import { useEffect, useState } from "react";

// Converte um Blob em object URL e — o motivo de existir — revoga essa URL
// quando o componente desmonta ou o Blob é trocado.
//
// A divisão é proposital: o TanStack Query cacheia os BYTES (o Blob) e este
// hook é dono da URL. Se a URL fosse o valor cacheado, o garbage collector do
// Query poderia descartar a entrada com a URL ainda em uso na tela (imagem
// quebrada), ou mantê-la viva sem nunca revogar (vazamento). Com os bytes no
// cache, cada componente cria a SUA URL e a revoga no próprio cleanup.
//
// Mora em src/hooks (camada shared) e não dentro de features/refunds porque o
// ciclo da foto de perfil vai precisar do mesmo comportamento, e o
// eslint-plugin-boundaries proíbe uma feature de importar de outra.
export function useObjectUrl(blob: Blob | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  return url;
}
```

- [ ] **Step 5: Rodar e ver passar**

```bash
npx vitest run src/hooks/useObjectUrl.test.ts
```

Esperado: 4 testes verdes.

- [ ] **Step 6: Rodar o lint e tratar `set-state-in-effect`**

```bash
npm run lint
```

A regra `react-hooks/set-state-in-effect` está **ligada em toda a árvore** (o `eslint.config.js` só a desliga em `src/components/ui/sidebar.tsx` e `src/hooks/use-mobile.ts`), e este hook chama `setUrl` dentro do corpo de um `useEffect`.

**Se o lint acusar**, adicionar a supressão na linha exata, com justificativa:

```ts
    const objectUrl = URL.createObjectURL(blob);
    // Sincronizar com um recurso externo que exige liberação explícita é
    // exatamente o caso de uso de um efeito com cleanup — a alternativa
    // (criar a URL durante o render, via useMemo) violaria react-hooks/purity
    // e ainda poderia vazar URLs quando o React descartasse o memo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
```

Supressão **na linha**, não no arquivo: o `eslint.config.js` documenta que a lista por nome de arquivo existe para violações que vieram do registry do shadcn e "é esperado que encolha" — acrescentar código nosso a ela contraria o propósito escrito.

**Se o lint não acusar**, não adicione o comentário: uma diretiva de disable sem uso é ela mesma um problema.

Rodar `npm run lint` de novo. Esperado: **0 erros, 0 warnings**.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useObjectUrl.ts src/hooks/useObjectUrl.test.ts src/test/setup.ts
git commit -m "feat: add a hook owning the object URL lifetime"
```

---

### Task 6: `receiptQuery` e o handler binário

**Files:**
- Modify: `src/features/refunds/api/refundQueries.ts`
- Create: `src/features/refunds/hooks/useReceipt.ts`
- Modify: `src/test/msw/handlers.ts`
- Create: `src/features/refunds/api/receiptQuery.test.tsx`

**Interfaces:**
- Consumes: nada da Task 5.
- Produces: `refundKeys.receipt(id: string)`, `receiptQuery(id: string)` devolvendo `Blob`, e `useReceipt(id: string | undefined)`.

- [ ] **Step 1: Adicionar o handler binário do MSW**

Em `src/test/msw/handlers.ts`, no topo (depois dos imports):

```ts
// A real 1x1 transparent PNG. The bytes matter less than the Content-Type —
// the preview branches on blob.type — but a decodable image keeps the fixture
// honest if it is ever opened in a real browser.
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export const receiptPngBytes = Uint8Array.from(atob(PNG_BASE64), (char) => char.charCodeAt(0));
```

E, **antes** do handler `http.get("*/refunds/:id")` (rotas mais específicas primeiro), o handler do comprovante:

```ts
  // Receipt: binary body, with the Content-Type the backend derives from the
  // stored extension. There is no JSON here to validate.
  http.get("*/refunds/:id/receipt", () => {
    return new HttpResponse(receiptPngBytes, {
      headers: { "Content-Type": "image/png" },
    });
  }),
```

- [ ] **Step 2: Escrever o teste que falha**

Criar `src/features/refunds/api/receiptQuery.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryWrapper } from "@/test/utils";
import { useReceipt } from "../hooks/useReceipt";

describe("useReceipt", () => {
  // The query must hand back a Blob carrying the Content-Type the API sent:
  // that type is what the preview branches on to choose <img> or <object>.
  it("returns a Blob typed by the response Content-Type", async () => {
    const { result } = renderHook(() => useReceipt("1"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeInstanceOf(Blob);
    expect(result.current.data?.type).toContain("image/png");
  });

  // A refund belonging to someone else answers 404 — the query must end in
  // error rather than exposing an empty body as if it were a file.
  it("ends in error when the receipt is not found", async () => {
    server.use(
      http.get("*/refunds/:id/receipt", () =>
        HttpResponse.json({ detail: "Refund not found" }, { status: 404 })
      )
    );

    const { result } = renderHook(() => useReceipt("1"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  // Without an id there is nothing to fetch and the query stays disabled.
  it("stays disabled without an id", () => {
    const { result } = renderHook(() => useReceipt(undefined), { wrapper: QueryWrapper });

    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
npx vitest run src/features/refunds/api/receiptQuery.test.tsx
```

Esperado: FAIL — `Cannot find module '../hooks/useReceipt'`.

- [ ] **Step 4: Adicionar a chave e a query**

Em `src/features/refunds/api/refundQueries.ts`, dentro de `refundKeys`, depois de `detail`:

```ts
  // O comprovante de um reembolso. Fica sob o prefixo ["refunds"] como os
  // demais, mas NÃO é invalidado na exclusão: useDeleteRefund mira
  // refundKeys.lists() justamente para não rebuscar o que acabou de sumir, e
  // o comprovante segue a mesma regra.
  receipt: (id: string) => [...refundKeys.all, "receipt", id] as const,
```

E, ao fim do arquivo:

```ts
// Única query do projeto sem Zod, e por um motivo legítimo: as outras validam
// JSON, aqui a resposta é binária. A fronteira já é o Content-Type, derivado
// pelo backend da extensão armazenada — não há estrutura a parsear.
export function receiptQuery(id: string) {
  return queryOptions({
    queryKey: refundKeys.receipt(id),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Blob>(`/refunds/${id}/receipt`, {
        responseType: "blob",
        signal,
      });
      return data;
    },
  });
}
```

- [ ] **Step 5: Criar o hook**

`src/features/refunds/hooks/useReceipt.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { receiptQuery } from "../api/refundQueries";

// Espelha useRefund: sem id (rota mal formada), a query fica desabilitada e a
// chave com "" nunca chega a virar requisição.
export function useReceipt(id: string | undefined) {
  return useQuery({
    ...receiptQuery(id ?? ""),
    enabled: !!id,
  });
}
```

- [ ] **Step 6: Rodar e ver passar**

```bash
npx vitest run src/features/refunds/api/receiptQuery.test.tsx
```

Esperado: 3 verdes.

> **Se o primeiro teste falhar dizendo que `data` não é um `Blob`:** o adaptador XHR do axios sob jsdom pode não honrar `responseType: "blob"`. Fallback documentado — trocar por `responseType: "arraybuffer"` e montar o Blob a partir do header:
> ```ts
>       const response = await api.get<ArrayBuffer>(`/refunds/${id}/receipt`, {
>         responseType: "arraybuffer",
>         signal,
>       });
>       return new Blob([response.data], {
>         type: String(response.headers["content-type"] ?? "application/octet-stream"),
>       });
> ```
> O contrato do hook (`Blob` com `type` preenchido) não muda, então nada mais precisa ser tocado.

- [ ] **Step 7: Rodar tudo e commitar**

```bash
npm run test && npx tsc -b --noEmit && npm run lint
git add src/features/refunds src/test/msw/handlers.ts
git commit -m "feat: fetch the receipt through the authenticated route"
```

---

### Task 7: `ReceiptPreview`

**Files:**
- Create: `src/features/refunds/components/ReceiptPreview.tsx`
- Create: `src/features/refunds/components/ReceiptPreview.test.tsx`
- Modify: `src/features/refunds/index.ts`

**Interfaces:**
- Consumes: `useReceipt` (Task 6), `useObjectUrl` (Task 5).
- Produces: `<ReceiptPreview refundId={string} refundName={string} />`, exportado pela fachada.

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/features/refunds/components/ReceiptPreview.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryWrapper } from "@/test/utils";
import ReceiptPreview from "./ReceiptPreview";

function renderPreview() {
  return render(
    <QueryWrapper>
      <ReceiptPreview refundId="1" refundName="Almoço com cliente" />
    </QueryWrapper>
  );
}

describe("ReceiptPreview", () => {
  // An image receipt renders as an <img> with an accessible name naming the
  // refund, so a screen reader user knows which receipt this is.
  it("renders an image receipt", async () => {
    renderPreview();

    const image = await screen.findByRole("img", { name: /Almoço com cliente/ });
    expect(image).toHaveAttribute("src", expect.stringMatching(/^blob:/));
  });

  // A PDF cannot go in an <img>. The component must branch on the blob's type
  // and render an embed with a link fallback instead.
  it("renders a PDF receipt as an embed with a fallback link", async () => {
    server.use(
      http.get("*/refunds/:id/receipt", () =>
        new HttpResponse(new Uint8Array([37, 80, 68, 70]), {
          headers: { "Content-Type": "application/pdf" },
        })
      )
    );

    renderPreview();

    expect(await screen.findByRole("link", { name: "Abrir comprovante" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^blob:/)
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  // A 404 (missing file, or someone else's refund) must show a message rather
  // than a broken image frame.
  it("shows an error message when the receipt cannot be loaded", async () => {
    server.use(
      http.get("*/refunds/:id/receipt", () =>
        HttpResponse.json({ detail: "Refund not found" }, { status: 404 })
      )
    );

    renderPreview();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o comprovante."
    );
  });

  // Fullscreen reuses the very same object URL: creating a second one would
  // mean two owners for a resource that has to be revoked exactly once.
  it("opens the receipt in a dialog reusing the same object URL", async () => {
    const user = userEvent.setup();
    renderPreview();

    const inlineImage = await screen.findByRole("img", { name: /Almoço com cliente/ });
    const inlineSrc = inlineImage.getAttribute("src");

    await user.click(screen.getByRole("button", { name: "Ver em tela cheia" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", inlineSrc);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run src/features/refunds/components/ReceiptPreview.test.tsx
```

Esperado: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar o componente**

Criar `src/features/refunds/components/ReceiptPreview.tsx`:

```tsx
import { useState } from "react";
import { Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useObjectUrl } from "@/hooks/useObjectUrl";
import { useReceipt } from "../hooks/useReceipt";

interface ReceiptPreviewProps {
  refundId: string;
  refundName: string;
}

export default function ReceiptPreview({ refundId, refundName }: ReceiptPreviewProps) {
  const { data: blob, isPending, isError } = useReceipt(refundId);
  // Uma URL, um dono: ela é criada aqui e a MESMA string vai para o diálogo de
  // tela cheia. Se o diálogo criasse a sua, seriam dois donos de um recurso que
  // precisa ser revogado exatamente uma vez.
  const objectUrl = useObjectUrl(blob);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (isError) {
    return (
      <p role="alert" className="py-4 text-center text-sm text-destructive">
        Não foi possível carregar o comprovante.
      </p>
    );
  }

  if (isPending || !objectUrl) {
    return <Skeleton className="h-48 w-full" />;
  }

  // O tipo vem de graça: o backend define o Content-Type pela extensão
  // armazenada e o Blob carrega isso. Nenhum campo novo no contrato.
  const isImage = blob.type.startsWith("image/");
  const alt = `Comprovante de ${refundName}`;

  return (
    <div className="flex flex-col gap-2">
      {isImage ? (
        <img src={objectUrl} alt={alt} className="max-h-64 w-full rounded-md object-contain" />
      ) : (
        <object data={objectUrl} type={blob.type} className="h-64 w-full rounded-md" aria-label={alt}>
          <a href={objectUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
            Abrir comprovante
          </a>
        </object>
      )}

      <Button variant="outline" size="sm" className="self-end" onClick={() => setIsFullscreen(true)}>
        <Expand className="size-4" aria-hidden />
        Ver em tela cheia
      </Button>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{alt}</DialogTitle>
          </DialogHeader>
          {isImage ? (
            <img src={objectUrl} alt={alt} className="max-h-[70vh] w-full object-contain" />
          ) : (
            <object data={objectUrl} type={blob.type} className="h-[70vh] w-full" aria-label={alt}>
              <a href={objectUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                Abrir comprovante
              </a>
            </object>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 4: Exportar pela fachada**

Em `src/features/refunds/index.ts`, junto do `RefundFormDialog`:

```ts
export { default as ReceiptPreview } from "./components/ReceiptPreview";
```

- [ ] **Step 5: Rodar e ver passar**

```bash
npx vitest run src/features/refunds/components/ReceiptPreview.test.tsx
```

Esperado: 4 verdes.

> Se o teste do PDF não achar o link: no jsdom o conteúdo de fallback de um `<object>` fica acessível na árvore. Caso a asserção por `role="link"` falhe, trocar por `screen.findByText("Abrir comprovante")` e afirmar o `href` no elemento pai — a intenção do teste (fallback presente e apontando para a object URL) é a mesma.

- [ ] **Step 6: Commit**

```bash
npm run test && npx tsc -b --noEmit && npm run lint
git add src/features/refunds
git commit -m "feat: preview the receipt inline with a fullscreen dialog"
```

---

### Task 8: Integrar o preview no detalhe e remover `getReceiptUrl`

Fecha a regressão temporária aberta na Task 2.

**Files:**
- Modify: `src/pages/PageRefundDetails.tsx`
- Modify: `src/pages/PageRefundDetails.test.tsx`
- Modify: `src/lib/api.ts`

**Interfaces:**
- Consumes: `ReceiptPreview` da fachada (Task 7).
- Produces: `getReceiptUrl` deixa de existir.

- [ ] **Step 1: Escrever o teste que falha**

Em `src/pages/PageRefundDetails.test.tsx`, acrescentar ao `describe`:

```tsx
  // The receipt is no longer a public URL: the page must render the preview,
  // which fetches the file through the authenticated route.
  it("renders the receipt preview", async () => {
    renderPageRefundDetails();

    expect(
      await screen.findByRole("img", { name: `Comprovante de ${refundFixture.name}` })
    ).toBeInTheDocument();
  });
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run src/pages/PageRefundDetails.test.tsx
```

Esperado: FAIL — a página não renderiza o preview.

- [ ] **Step 3: Montar o preview na página**

Em `src/pages/PageRefundDetails.tsx`, incluir `ReceiptPreview` no import da fachada:

```ts
import { CATEGORIES, ReceiptPreview, useDeleteRefund, useRefund } from "@/features/refunds";
```

E, dentro do `<CardContent>`, no lugar onde estava o link (depois do campo Valor):

```tsx
              {id && <ReceiptPreview refundId={id} refundName={refund.name} />}
```

- [ ] **Step 4: Remover `getReceiptUrl`**

Em `src/lib/api.ts`, apagar a função e seu comentário de três linhas:

```ts
// O backend serve os arquivos de recibo estaticamente em /receipts/{filename}
// … (apagar todo o bloco, incluindo a função getReceiptUrl)
```

- [ ] **Step 5: Confirmar que ninguém mais a usa**

```bash
grep -rn "getReceiptUrl" src/
```

Esperado: **nenhuma saída**.

- [ ] **Step 6: Rodar tudo e commitar**

```bash
npm run test && npx tsc -b --noEmit && npm run lint && npm run build
git add src/pages/PageRefundDetails.tsx src/pages/PageRefundDetails.test.tsx src/lib/api.ts
git commit -m "feat: show the receipt preview and drop the public URL helper"
```

---

### Task 9: Badge de status

**Files:**
- Create: `src/features/refunds/constants/status.ts`
- Modify: `src/features/refunds/index.ts`
- Modify: `src/pages/PageHome.tsx`
- Modify: `src/pages/PageRefundDetails.tsx`
- Modify: `src/pages/PageHome.test.tsx`

**Interfaces:**
- Consumes: `RefundStatus` (Task 2).
- Produces: `REFUND_STATUS: Record<RefundStatus, { label: string; variant: "default" | "secondary" | "destructive" }>`, exportado pela fachada.

- [ ] **Step 1: Escrever o teste que falha**

Em `src/pages/PageHome.test.tsx`, acrescentar ao `describe`:

```tsx
  // Each row carries its status, so the list is readable without opening a
  // refund. Read-only here: approving and rejecting is a later cycle.
  it("shows the status of each row", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));

    renderPageHome();

    expect(await screen.findAllByText("Pendente")).toHaveLength(10);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run src/pages/PageHome.test.tsx
```

Esperado: FAIL — nenhum texto "Pendente".

- [ ] **Step 3: Criar o mapa de status**

`src/features/refunds/constants/status.ts`:

```ts
import type { RefundStatus } from "../schemas/refund";

// Rótulo em português e a variante do Badge do design system. Nenhum token de
// cor novo é criado: as três variantes já existem em src/components/ui/badge.
export const REFUND_STATUS: Record<
  RefundStatus,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  pending: { label: "Pendente", variant: "secondary" },
  approved: { label: "Aprovado", variant: "default" },
  rejected: { label: "Rejeitado", variant: "destructive" },
};
```

Exportar em `src/features/refunds/index.ts`:

```ts
export { REFUND_STATUS } from "./constants/status";
```

- [ ] **Step 4: Renderizar na Home**

Em `src/pages/PageHome.tsx`, incluir nos imports:

```ts
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, REFUND_STATUS, useRefunds } from "@/features/refunds";
```

Na linha da lista, o lado direito é hoje um `<span>` solto com o valor:

```tsx
                  <span className="text-sm">{formatCentsToBRL(refund.amount_in_cents)}</span>
```

Substituir **esse `<span>`** por um grupo com o badge à esquerda do valor:

```tsx
                  <div className="flex items-center gap-3">
                    <Badge variant={REFUND_STATUS[refund.status].variant}>
                      {REFUND_STATUS[refund.status].label}
                    </Badge>
                    <span className="text-sm">{formatCentsToBRL(refund.amount_in_cents)}</span>
                  </div>
```

- [ ] **Step 5: Renderizar no detalhe**

Em `src/pages/PageRefundDetails.tsx`, incluir `Badge` e `REFUND_STATUS` nos imports e, no `<CardHeader>`, depois do `<CardDescription>`:

```tsx
              <Badge variant={REFUND_STATUS[refund.status].variant} className="w-fit">
                {REFUND_STATUS[refund.status].label}
              </Badge>
```

- [ ] **Step 6: Rodar tudo e commitar**

```bash
npm run test && npx tsc -b --noEmit && npm run lint
git add src/features/refunds src/pages
git commit -m "feat: show the refund status as a read-only badge"
```

---

### Task 10: Fechar a asserção vazia do `PageHome.test.tsx`

O teste da busca com debounce afirma "reseta a página para 1", mas a fixture nunca começa em `page>=2` — então essa metade **não pode falhar**, e o ramo correspondente de `updateListLocation` fica sem cobertura real.

**Files:**
- Modify: `src/pages/PageHome.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: nada.

- [ ] **Step 1: Fazer o teste começar na página 2**

Dar a `renderPageHome` uma entrada inicial configurável:

```tsx
function renderPageHome(initialEntry = "/") {
  const url = new URL(initialEntry, "http://localhost");
  const page = Number(url.searchParams.get("page") ?? 1);

  const router = createMemoryRouter(
    [
      {
        path: "/",
        loader: () => ({ page, perPage: 10, name: undefined }),
        Component: PageHome,
      },
    ],
    { initialEntries: [initialEntry] }
  );

  const view = render(
    <QueryWrapper>
      <RouterProvider router={router} />
    </QueryWrapper>
  );

  return { ...view, router };
}
```

- [ ] **Step 2: Reescrever o teste da busca**

Substituir o teste `"updates the search param on the URL after debounce and resets the page"` por:

```tsx
  // RefundSearch debounces typing before pushing it to the URL. Starting on
  // page 2 is what makes the reset assertion real: the page param must
  // disappear (page 1 carries no param by design), which is the branch in
  // updateListLocation that had no coverage while the fixture always started
  // on page 1.
  it("updates the search param after debounce and resets away from page 2", async () => {
    server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));
    const user = userEvent.setup();

    const { router } = renderPageHome("/?page=2");
    expect(router.state.location.search).toBe("?page=2");

    const searchField = await screen.findByRole("textbox", { name: "Pesquisar pelo nome" });
    await user.type(searchField, "Ana");

    await waitFor(
      () => {
        expect(router.state.location.search).toBe("?name=Ana");
      },
      { timeout: 2000 }
    );
  });
```

A asserção final é a prova dupla: `name` entrou **e** `page` saiu.

- [ ] **Step 3: Provar que o teste pega a regressão**

Comente temporariamente o bloco `if (nextPage > 1) … else nextParams.delete("page")` em `src/pages/PageHome.tsx`, deixando só o `set`. Rode:

```bash
npx vitest run src/pages/PageHome.test.tsx
```

Esperado: **FAIL**, com `"?page=2&name=Ana"` recebido no lugar de `"?name=Ana"`. Desfaça o comentário e rode de novo — verde. Este passo é o ponto da task: sem ele, não há prova de que a asserção deixou de ser vazia.

- [ ] **Step 4: Commit**

```bash
npm run test && npx tsc -b --noEmit
git add src/pages/PageHome.test.tsx
git commit -m "test: make the page-reset assertion able to fail"
```

---

### Task 11: Verificação final e fechamento

**Files:**
- Modify: `../Refund-api/docs/plans/current-state.md`
- Modify: `../Refund-api/docs/learning-path-progress.md`

**Interfaces:**
- Consumes: todas as tasks anteriores.
- Produces: documentação canônica atualizada, conforme o
  [fluxo da trilha](../../../Refund-api/docs/plans/learning-path-workflow.md).

- [ ] **Step 1: Rodar a verificação completa do frontend**

```bash
npm run test
npx tsc -b --noEmit
npm run lint
npm run build
```

Esperado: todos verdes; lint em **0 erros, 0 warnings**; build sem aviso de chunk. Anote os números reais (quantidade de testes) — eles entram na documentação.

- [ ] **Step 2: Validar no navegador contra a API real**

Com o backend em `localhost:3333` e o Vite em `localhost:5173`, percorra:

1. **Logout forçado** — com uma sessão antiga no `localStorage` (sem `id`), o primeiro carregamento cai no `/login`. Este é o efeito previsto na spec, não um bug.
2. Login, listagem, detalhe e criação **sem erro de parse do Zod** — isto fecha a pendência "Aberto 1/4" do `current-state.md`.
3. Preview de comprovante em **imagem** e em **PDF**, incluindo o botão de tela cheia.
4. Badge nos três status (use o `PATCH /refunds/{id}/status` com o admin de teste para produzir `approved` e `rejected`).
5. Comprovante de outro usuário: com um segundo usuário `standard`, acessar o detalhe alheio deve dar 404 sem vazar bytes nem quebrar a tela.
6. Paginação com 10 itens por página.

Registre o que passou e o que não passou. Não apresente como validado o que não foi exercido.

- [ ] **Step 3: Atualizar o `current-state.md`**

No `Refund-api`:

- Corrigir a afirmação de que o workflow de aprovação "ainda não foi mesclado" — está na `main` desde `177f929`.
- Marcar como mesclada a pilha `feat/refund-query-and-avatar` → `feat/authenticated-file-serving`.
- Registrar este ciclo como concluído, com os números de verificação reais.
- Baixar a pendência "Aberto 1/4" (runtime do Item 2) se o Step 2 a cobriu.
- Substituir a seção "Backlog do frontend" pelo que **restou**: ciclos B (aprovação na UI), C (TanStack Table) e D (foto de perfil).
- Remover das pendências os itens fechados aqui: `per_page` em dois lugares, `localStorage` com type assertion, asserção vazia do `PageHome.test.tsx`.
- Manter as pendências não tocadas: `select_for_update` segurando conexão, pool pequeno, contraste não auditado, rejeição de comprovante em runtime, "Choose File", `avatar_filename` cru.

- [ ] **Step 4: Atualizar o `learning-path-progress.md`**

Registrar, no formato do diário: motivo do ciclo, estado anterior com trechos, limitação encontrada, comparação antes/depois, estado ajustado, arquivos modificados, verificações e resultados, e o conceito a lembrar — **o cache guarda os bytes, o componente guarda a URL**, e por que cachear a object URL produziria imagem quebrada ou vazamento.

- [ ] **Step 5: Commit da documentação**

```bash
cd ../Refund-api
git add docs/plans/current-state.md docs/learning-path-progress.md
git commit -m "docs: close the frontend contract and receipt cycle"
```

- [ ] **Step 6: Apresentar o fechamento**

Conforme o fluxo da trilha, apresentar o fechamento ao Gabriel e **aguardar autorização** antes do merge do frontend e antes de iniciar o próximo ciclo. Lembrar no fechamento: **o deploy é conjunto e obrigatório** — não existe ordem segura entre os dois repositórios.

---

## Fora deste plano

Workflow de aprovação na UI, TanStack Table com toolbar (Item 13), upload e exibição de foto de perfil, a decisão sobre `avatar_filename` cru, e a rota dedicada de comprovante. Cada um tem seu próprio ciclo de spec → plano → execução.
