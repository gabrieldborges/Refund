# Feedback de carregamento e ajustes de UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o estado de carregamento durar até o trabalho terminar de verdade — nas cinco mutations e nos três fluxos que navegam — e resolver quatro ajustes de UI levantados na validação em navegador.

**Architecture:** Tudo no `Refund-FrontEnd`, sem backend. Duas causas distintas com o mesmo sintoma: os hooks de mutation descartam a promise de `invalidateQueries` (corrige-se devolvendo-a), e os fluxos que terminam em `navigate` não observam a transição do router (corrige-se com `useNavigation`). O resto é UI localizada.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, React Router 7 (Data Mode), Tailwind 4, shadcn/ui, lucide-react, Vitest + Testing Library + MSW.

**Spec:** [`2026-07-31-loading-feedback-and-ui-fixes-design.md`](../specs/2026-07-31-loading-feedback-and-ui-fixes-design.md)

## Global Constraints

- **Nenhuma mudança no `Refund-api`.** Se uma task parecer exigir backend, pare e reporte.
- **Textos de UI em português; código, identificadores e comentários em inglês** (`AGENTS.md`), exceto onde o arquivo já carrega comentários em português — nesse caso, acompanhe o arquivo.
- **Os alvos de invalidação NÃO mudam.** `useReviewRefund`/`usePayRefund` miram `refundKeys.all`; `useDeleteRefund`/`useCreateRefund` miram `refundKeys.lists()`. Isso é deliberado e documentado no próprio código. Ampliar um alvo seria mudança de comportamento disfarçada de correção de spinner.
- **O card de pendentes é global:** nunca acompanha filtro nem paginação.
- **Camadas** (`eslint-plugin-boundaries`): a feature `refunds` importa `ui`/shared e o próprio interior; nunca `@/context` nem `pages/`. Páginas importam da fachada `@/features/refunds`.
- **Spinner:** `Loader2` do `lucide-react` com `animate-spin`, inline em cada botão, mais `aria-busy` no botão. Nenhum componente novo — se um sétimo call site aparecer, aí se extrai.
- **Verificação por task:** `npx vitest run`, `npx tsc -b --noEmit`, `npm run lint` — os três limpos antes do commit. Ponto de partida: 215 testes / 42 arquivos, `tsc` exit 0, lint 0/0.
- **Ruído pré-existente, não é para corrigir:** `Not implemented: navigation to another Document` (jsdom) e o flake intermitente `ResizeObserver is not defined` em `Sidebar.test.tsx`.
- **Um commit por task.**

---

### Task 1: Devolver a promise da invalidação nos quatro hooks

A correção de uma linha por hook, e o teste que prova que ela importa. Fundação das Tasks 2 e 3.

**Files:**
- Modify: `src/features/refunds/hooks/useReviewRefund.ts`, `usePayRefund.ts`, `useDeleteRefund.ts`, `useCreateRefund.ts`
- Test: `src/features/refunds/hooks/useReviewRefund.test.tsx` (existente)

**Interfaces:**
- Produces: os quatro hooks mantêm `isPending` verdadeiro até os refetches resolverem. Nenhuma assinatura muda.

- [ ] **Step 1: Escrever o teste que falha**

Em `src/features/refunds/hooks/useReviewRefund.test.tsx`, acrescentar. Este teste é o coração da task: ele precisa distinguir "o PATCH respondeu" de "os refetches terminaram", porque um teste que só aguarde o `mutateAsync` passa com o código antigo.

```tsx
// A mutation's pending state must cover the refetches it triggers, not just
// its own HTTP call. Without this, the UI says "done" while the screen still
// shows stale data — the exact bug this task fixes. The gate below holds the
// refetch open so the two moments are observably different.
it("stays pending until the invalidated queries have refetched", async () => {
  let releaseRefetch!: () => void;
  const refetchGate = new Promise<void>((resolve) => {
    releaseRefetch = resolve;
  });
  let patchResolved = false;
  let refetchStarted = false;

  server.use(
    http.patch("*/refunds/:id/status", () => {
      patchResolved = true;
      return new HttpResponse(null, { status: 204 });
    }),
    http.get("*/refunds/:id", async ({ params }) => {
      // The first call is the initial load; only gate the refetch.
      if (refetchStarted) await refetchGate;
      refetchStarted = true;
      return HttpResponse.json({
        type: "Refund",
        count: 1,
        attributes: { ...refundFixture, id: Number(params.id) },
      });
    })
  );

  const { result } = renderHook(
    () => ({ detail: useRefund("1"), review: useReviewRefund() }),
    { wrapper: QueryWrapper }
  );

  // An ACTIVE query must exist, or there is nothing for the invalidation to
  // wait on and the test would pass either way.
  await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));

  result.current.review.mutate({ id: "1", status: "approved" });

  await waitFor(() => expect(patchResolved).toBe(true));
  // The HTTP call is done; the screen is not updated yet. This is the
  // assertion the old code fails.
  expect(result.current.review.isPending).toBe(true);

  releaseRefetch();
  await waitFor(() => expect(result.current.review.isPending).toBe(false));
});
```

Imports necessários no arquivo: `waitFor` de `@testing-library/react`, `useRefund` de `../hooks/useRefund`, `refundFixture` de `@/test/msw/handlers`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/features/refunds/hooks/useReviewRefund.test.tsx`
Expected: FAIL em `expect(result.current.review.isPending).toBe(true)` — recebe `false`, porque hoje o `isPending` acaba junto com o PATCH.

- [ ] **Step 3: Devolver a promise nos quatro hooks**

Em cada um dos quatro arquivos, trocar o corpo com chaves por um retorno. O alvo da invalidação **não muda** em nenhum deles.

`useReviewRefund.ts` e `usePayRefund.ts`:

```ts
    // A promise é DEVOLVIDA de propósito: o React Query mantém a mutation em
    // `isPending` até um callback assíncrono resolver. Sem isso o botão volta
    // ao normal quando o HTTP termina, com a tela ainda mostrando o estado
    // anterior — o histórico, em particular, ainda não foi regerado.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: refundKeys.all, refetchType: "all" }),
```

`useDeleteRefund.ts` e `useCreateRefund.ts` — idem, preservando `refundKeys.lists()`:

```ts
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: refundKeys.lists(), refetchType: "all" }),
```

Preserve os comentários que já existem acima de cada `onSuccess` — eles explicam a escolha do alvo, que continua válida.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/features/refunds/hooks/`
Expected: PASS. Os testes existentes dos quatro hooks continuam verdes — se algum passar a estourar timeout, é sinal de que ele aguardava `isPending` cair sem ter uma query ativa resolvida; ajuste o teste, não o hook, e relate.

- [ ] **Step 5: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/features/refunds/hooks/
git commit -m "fix(refunds): keep mutations pending until their refetches settle"
```

---

### Task 2: Spinner nos botões de decisão e de pagamento

**Files:**
- Modify: `src/features/refunds/components/ReviewDecision.tsx`
- Modify: `src/features/refunds/components/PayRefundDialog.tsx`
- Test: `ReviewDecision.test.tsx`, `PayRefundDialog.test.tsx` (existentes)

**Interfaces:**
- Consumes: o `isPending` corrigido na Task 1.

- [ ] **Step 1: Escrever os testes que falham**

Em `ReviewDecision.test.tsx`:

```tsx
// The clicked button must say what it is doing, not just go grey. A disabled
// button with its original label is indistinguishable from a dead UI.
it("shows a busy label on the approve button while the decision is in flight", async () => {
  const user = userEvent.setup();
  server.use(
    http.patch("*/refunds/:id/status", async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return new HttpResponse(null, { status: 204 });
    })
  );

  renderDecision({ status: "pending" });

  await user.click(screen.getByRole("button", { name: "Aprovar" }));

  const busy = await screen.findByRole("button", { name: /Aprovando/ });
  expect(busy).toBeDisabled();
  expect(busy).toHaveAttribute("aria-busy", "true");
});

// The other actions must not stay clickable while one is running — two
// concurrent decisions on the same refund is exactly the race the backend
// guards against with a conditional UPDATE.
it("disables the other decision buttons while one is in flight", async () => {
  const user = userEvent.setup();
  server.use(
    http.patch("*/refunds/:id/status", async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return new HttpResponse(null, { status: 204 });
    })
  );

  renderDecision({ status: "pending" });

  await user.click(screen.getByRole("button", { name: "Aprovar" }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Rejeitar" })).toBeDisabled();
  });
});
```

Adapte `renderDecision` ao helper que já existe no arquivo.

Em `PayRefundDialog.test.tsx`, o equivalente para o botão de confirmar pagamento, esperando o rótulo `/Marcando como pago/`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/features/refunds/components/ReviewDecision.test.tsx`
Expected: FAIL — não existe botão com nome acessível "Aprovando…".

- [ ] **Step 3: Implementar em `ReviewDecision.tsx`**

Importar `Loader2` de `lucide-react`. Acrescentar, acima do `return`:

```tsx
  // Qual ação está em voo. `isPending` sozinho não diz qual botão foi clicado,
  // e sem isso os dois botões mostrariam spinner ao mesmo tempo.
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);
```

`handleApprove` passa a marcar `setPendingAction("approve")` antes do `await` e `setPendingAction(null)` num `finally`; `handleReject` faz o mesmo com `"reject"`.

Os botões passam a:

```tsx
        {status === "pending" && (
          <Button onClick={handleApprove} disabled={isPending} aria-busy={pendingAction === "approve"} className="flex-1">
            {pendingAction === "approve" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {pendingAction === "approve" ? "Aprovando…" : "Aprovar"}
          </Button>
        )}
```

O mesmo padrão no botão de aprovar do ramo `rejected`, no de rejeitar (que abre o diálogo — este **não** ganha spinner, porque abrir um diálogo é instantâneo; ele apenas fica desabilitado) e no de marcar como pago (idem, abre diálogo).

O botão **Confirmar** dentro do diálogo de rejeição troca o texto atual por:

```tsx
                <Button type="submit" variant="destructive" disabled={isPending} aria-busy={pendingAction === "reject"}>
                  {pendingAction === "reject" && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  {pendingAction === "reject" ? "Rejeitando…" : "Confirmar"}
                </Button>
```

- [ ] **Step 4: Implementar em `PayRefundDialog.tsx`**

Mesmo padrão, com um estado local só (há uma ação): spinner e rótulo "Marcando como pago…" no botão de confirmar, `aria-busy`, e o botão de cancelar desabilitado durante a ação.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/features/refunds/components/`
Expected: PASS

- [ ] **Step 6: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/features/refunds/components/
git commit -m "feat(refunds): show a spinner and busy label on decision buttons"
```

---

### Task 3: Feedback nas ações que navegam

**Files:**
- Modify: `src/pages/PageLogin.tsx`
- Modify: `src/pages/PageRefundDetails.tsx`
- Modify: `src/features/refunds/components/RefundFormDialog.tsx`
- Test: `PageLogin.test.tsx`, `PageRefundDetails.test.tsx`, `RefundFormDialog.test.tsx`

**Interfaces:**
- Produces: nenhuma assinatura nova. Cada um passa a observar `useNavigation()`.

- [ ] **Step 1: Escrever o teste que falha**

Em `PageLogin.test.tsx`:

```tsx
// The submit button must stay busy until the app has actually moved. Before
// this, isSubmitting fell as soon as login() resolved, leaving a ready-looking
// button on a page that had not changed yet — the router's loader was still
// fetching.
it("keeps the submit button busy while the post-login navigation is in flight", async () => {
  const user = userEvent.setup();
  server.use(
    http.get("*/refunds", async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      return HttpResponse.json(emptyListResponse());
    })
  );

  renderLoginWithHomeRoute();

  await user.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");
  await user.type(screen.getByLabelText("Senha"), "123456");
  await user.click(screen.getByRole("button", { name: /Entrar/ }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: /Entrando/ })).toBeDisabled();
  });
});
```

`renderLoginWithHomeRoute` precisa de um router com **duas** rotas — login e uma Home com loader lento — senão não há navegação a observar. Monte-o no arquivo seguindo o estilo do helper existente.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/pages/PageLogin.test.tsx`
Expected: FAIL — o botão volta a "Entrar" antes de a navegação concluir.

- [ ] **Step 3: Implementar**

Em `PageLogin.tsx`:

```tsx
import { useNavigation } from "react-router";

  // `isSubmitting` cobre a requisição de login; ele cai assim que `login()`
  // resolve. Mas `navigate("/")` inicia uma transição cujo loader ainda vai
  // buscar dados, e durante ela a pessoa continua vendo a tela de login. O
  // estado do router é o que fecha essa janela.
  const navigation = useNavigation();
  const isBusy = form.formState.isSubmitting || navigation.state !== "idle";
```

O botão usa `disabled={isBusy}`, `aria-busy={isBusy}`, spinner e o rótulo "Entrando…".

Em `PageRefundDetails.tsx`, o mesmo para o botão de confirmar exclusão: `isDeleting || navigation.state !== "idle"`, rótulo "Excluindo…".

Em `RefundFormDialog.tsx`, idem para o botão de enviar: rótulo "Enviando…".

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/pages/ src/features/refunds/components/RefundFormDialog.test.tsx`
Expected: PASS

- [ ] **Step 5: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/pages/PageLogin.tsx src/pages/PageLogin.test.tsx src/pages/PageRefundDetails.tsx \
        src/pages/PageRefundDetails.test.tsx src/features/refunds/components/RefundFormDialog.tsx \
        src/features/refunds/components/RefundFormDialog.test.tsx
git commit -m "feat: keep buttons busy until the navigation they trigger settles"
```

---

### Task 4: Card de pendentes do admin

**Files:**
- Create: `src/features/refunds/hooks/usePendingCount.ts`
- Create: `src/features/refunds/hooks/usePendingCount.test.tsx`
- Modify: `src/features/refunds/index.ts`
- Modify: `src/pages/PageHome.tsx`
- Modify: `src/pages/PageHome.test.tsx`

**Interfaces:**
- Produces: `usePendingCount(enabled: boolean)` devolvendo `{ count: number | undefined, isLoading, isError }`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/features/refunds/hooks/usePendingCount.test.tsx`:

```tsx
// The count must come from a query of its own, with fixed params — never from
// the Home's list. Asserting the outgoing request is what proves it: a hook
// that read the list's `total` would return the filtered number and this test
// would catch it.
it("asks for pending refunds with a one-row page", async () => {
  let captured: URLSearchParams | null = null;
  server.use(
    http.get("*/refunds", ({ request }) => {
      captured = new URL(request.url).searchParams;
      return HttpResponse.json({ ...emptyListResponse(), total: 7 });
    })
  );

  const { result } = renderHook(() => usePendingCount(true), { wrapper: QueryWrapper });

  await waitFor(() => expect(result.current.count).toBe(7));
  expect(captured!.get("status")).toBe("pending");
  expect(captured!.get("per_page")).toBe("1");
});

// A standard user must not fire this request at all — their number comes from
// refund-stats, which is already scoped to them.
it("does not request anything when disabled", async () => {
  let called = false;
  server.use(
    http.get("*/refunds", () => {
      called = true;
      return HttpResponse.json(emptyListResponse());
    })
  );

  const { result } = renderHook(() => usePendingCount(false), { wrapper: QueryWrapper });

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(called).toBe(false);
  expect(result.current.count).toBeUndefined();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/features/refunds/hooks/usePendingCount.test.tsx`
Expected: FAIL — `Failed to resolve import "./usePendingCount"`.

- [ ] **Step 3: Implementar o hook**

```ts
import { useQuery } from "@tanstack/react-query";
import { refundListQuery } from "../api/refundQueries";

// Quantas solicitações estão pendentes NO TOTAL — nunca a página atual, nunca
// o filtro ativo. Pede uma página de UMA linha e lê só o `total`, que a API
// calcula sobre o conjunto inteiro (UC-004); o corpo vem praticamente vazio.
//
// Só o admin precisa disto. Um usuário comum já recebe a própria contagem em
// GET /users/{id}/refund-stats, que por ser por usuário já ignora filtro e
// paginação — daí o `enabled`.
export function usePendingCount(enabled: boolean) {
  const { data, isLoading, isError } = useQuery({
    ...refundListQuery({ page: 1, perPage: 1, status: "pending" }),
    enabled,
  });

  return { count: data?.total, isLoading: enabled && isLoading, isError };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/features/refunds/hooks/usePendingCount.test.tsx`
Expected: PASS

- [ ] **Step 5: Exportar e montar na Home**

Na fachada:

```ts
// Contagem global de pendentes para o card do admin. Independente do filtro
// e da paginação da listagem, de propósito.
export { usePendingCount } from "./hooks/usePendingCount";
```

Em `PageHome.tsx`, `const { count: pendingCount, isLoading: isPendingLoading, isError: isPendingError } = usePendingCount(isAdmin);` e um terceiro card para o admin, espelhando o card "Pendentes" que o usuário comum já tem — mesma estrutura de skeleton e de erro (`role="alert"`, texto destrutivo), porque um erro que renderize `0` seria indistinguível de "não há pendentes".

- [ ] **Step 6: Escrever o teste de integração**

Em `PageHome.test.tsx`, o teste que prova o requisito central:

```tsx
// The pending card is global by definition: it answers "what needs my
// attention", which does not depend on what the user is currently filtering.
// This is the assertion that would fail if someone wired it to the list.
it("keeps the admin pending count unchanged when a status filter is active", async () => {
  server.use(
    http.get("*/refunds", ({ request }) => {
      const params = new URL(request.url).searchParams;
      // The dedicated pending query asks for per_page=1; the list does not.
      if (params.get("per_page") === "1") {
        return HttpResponse.json({ ...pagedListResponse(), total: 7 });
      }
      return HttpResponse.json({ ...pagedListResponse(), total: 2 });
    })
  );

  renderPageHome("/", "admin", 2, { status: "paid" });

  expect(await screen.findByText("7")).toBeInTheDocument();
});
```

- [ ] **Step 7: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/features/refunds/hooks/usePendingCount.ts src/features/refunds/hooks/usePendingCount.test.tsx \
        src/features/refunds/index.ts src/pages/PageHome.tsx src/pages/PageHome.test.tsx
git commit -m "feat(home): add a global pending count card for the admin"
```

---

### Task 5: Rótulos que declaram o escopo

**Files:**
- Modify: `src/pages/PageHome.tsx`
- Modify: `src/pages/PageHome.test.tsx`

- [ ] **Step 1: Escrever os testes que falham**

```tsx
// Three numbers side by side under generic labels, two following the filter
// and one ignoring it, is the confusion this fixes. Each label states its own
// scope.
it("names the active filter on the requests card", async () => {
  server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));

  renderPageHome("/", "admin", 2, { status: "paid" });

  expect(await screen.findByText("Solicitações (Pago)")).toBeInTheDocument();
});

it("uses the plain label when no filter is active", async () => {
  server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));

  renderPageHome("/", "admin", 2);

  expect(await screen.findByText("Solicitações")).toBeInTheDocument();
  expect(screen.queryByText(/Solicitações \(/)).not.toBeInTheDocument();
});

it("says the pending card ignores the filter when one is active", async () => {
  server.use(http.get("*/refunds", () => HttpResponse.json(pagedListResponse())));

  renderPageHome("/", "admin", 2, { status: "paid" });

  expect(await screen.findByText("Todas, sem o filtro")).toBeInTheDocument();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/pages/PageHome.test.tsx`
Expected: FAIL — os rótulos ainda são fixos.

- [ ] **Step 3: Implementar**

Ao lado de `moneyCardLabel`, no mesmo estilo:

```tsx
  // O `total` da listagem já vem estreitado pelo filtro (UC-004), então o
  // rótulo genérico prometia mais do que o número entrega.
  const requestsCardLabel = status ? `Solicitações (${REFUND_STATUS[status].label})` : "Solicitações";
```

O card de pendentes ganha, sob o número e só quando `status` existe, uma linha `<p className="text-xs text-muted-foreground">Todas, sem o filtro</p>`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/pages/PageHome.test.tsx`
Expected: PASS

- [ ] **Step 5: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/pages/PageHome.tsx src/pages/PageHome.test.tsx
git commit -m "feat(home): make the summary card labels state their scope"
```

---

### Task 6: Reset dos formulários ao fechar

**Files:**
- Modify: `src/features/refunds/components/RefundFormDialog.tsx`
- Modify: `src/features/refunds/components/ReviewDecision.tsx`
- Test: os arquivos de teste correspondentes

**Interfaces:**
- Produces: os dois diálogos abrem sempre limpos. Pré-requisito da Task 7.

- [ ] **Step 1: Escrever os testes que falham**

```tsx
// Cancelling must not leave the next visitor holding someone else's draft.
// The success path already resets; this is the path that did not.
it("clears the form when reopened after cancelling", async () => {
  const user = userEvent.setup();
  const { rerender } = renderDialog({ open: true });

  await user.type(screen.getByLabelText("Nome da solicitação"), "Almoço");
  rerender(dialogWith({ open: false }));
  rerender(dialogWith({ open: true }));

  expect(screen.getByLabelText("Nome da solicitação")).toHaveValue("");
});
```

Os rótulos estão conferidos: `RefundFormDialog` usa `Nome da solicitação`,
`Categoria` e `Valor` (`RefundFormDialog.tsx:80,95,120`); o diálogo de rejeição
em `ReviewDecision` usa `Motivo`.

Escreva o equivalente em `ReviewDecision.test.tsx` para o campo `Motivo`,
fechando o caminho de cancelamento pelo botão "Cancelar".

- [ ] **Step 2: Rodar e ver falhar**

Expected: FAIL — o valor digitado sobrevive à reabertura.

- [ ] **Step 3: Implementar**

Em cada diálogo, resetar quando ele fecha, em vez de só no sucesso. O caminho mais simples é interceptar o `onOpenChange`:

```tsx
  // Resetar ao FECHAR, não só ao enviar: quem preenche, desiste e reabre
  // encontrava o rascunho anterior. A Task 7 depende disto — "reabrir zerado"
  // é o requisito do botão da tela de sucesso.
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) form.reset();
    onOpenChange(nextOpen);
  }
```

E usar `handleOpenChange` no `<Dialog>`. O `form.reset()` que já existe no caminho de sucesso pode sair, já que o fechamento o cobre — **confirme lendo o fluxo** antes de remover, e se houver dúvida, deixe os dois (resetar duas vezes é inofensivo).

Em `ReviewDecision`, o mesmo para o diálogo de rejeição, cobrindo também o botão "Cancelar".

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/features/refunds/components/`
Expected: PASS

- [ ] **Step 5: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/features/refunds/components/
git commit -m "fix(refunds): reset dialog forms on close, not only on success"
```

---

### Task 7: Tela de sucesso com dois botões

**Files:**
- Modify: `src/components/core/MainLayout.tsx`
- Modify: `src/pages/PageSuccess.tsx`
- Create: `src/pages/PageSuccess.test.tsx`

**Interfaces:**
- Consumes: o reset da Task 6.
- Produces: `MainLayout` fornece `{ openNewRefund: () => void }` como contexto do `Outlet`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/pages/PageSuccess.test.tsx`:

```tsx
// Two buttons with two different jobs. The "new request" one must NOT
// navigate — it reopens the dialog in place; the old single button went to
// the Home, which is what this task fixes.
it("reopens the dialog without navigating", async () => {
  const user = userEvent.setup();
  const openNewRefund = vi.fn();
  const { router } = renderSuccess({ openNewRefund });

  await user.click(screen.getByRole("button", { name: "Nova solicitação" }));

  expect(openNewRefund).toHaveBeenCalledTimes(1);
  expect(router.state.location.pathname).toBe("/success");
});

it("offers a separate way back to the Home", async () => {
  const user = userEvent.setup();
  const { router } = renderSuccess();

  await user.click(screen.getByRole("button", { name: "Voltar para a Home" }));

  await waitFor(() => expect(router.state.location.pathname).toBe("/"));
});
```

`renderSuccess` monta um `createMemoryRouter` com uma rota pai que fornece o contexto via `<Outlet context={{ openNewRefund }} />` e a rota `/success` renderizando `PageSuccess`, mais uma rota `/` qualquer.

- [ ] **Step 2: Rodar e ver falhar**

Expected: FAIL — só existe um botão, e ele navega.

- [ ] **Step 3: Implementar**

Em `MainLayout.tsx`, tipar e fornecer o contexto:

```tsx
// O diálogo de nova solicitação vive aqui, mas a tela de sucesso precisa
// reabri-lo. Em vez de subir o estado para uma store global (que é
// persistida — um refresh restauraria um diálogo aberto), desce-se só o
// gatilho pelo mecanismo que o próprio router oferece.
export interface MainLayoutOutletContext {
  openNewRefund: () => void;
}
```

e `<Outlet context={{ openNewRefund: () => setIsNewRefundOpen(true) } satisfies MainLayoutOutletContext} />`.

Em `PageSuccess.tsx`, remover o comentário sobre "sub-fase de contexts" (a fase passou) e:

```tsx
  const { openNewRefund } = useOutletContext<MainLayoutOutletContext>();

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={openNewRefund}>Nova solicitação</Button>
        <Button variant="outline" onClick={() => navigate("/")}>
          Voltar para a Home
        </Button>
      </div>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/pages/PageSuccess.test.tsx`
Expected: PASS

- [ ] **Step 5: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/components/core/MainLayout.tsx src/pages/PageSuccess.tsx src/pages/PageSuccess.test.tsx
git commit -m "feat: offer both a new request and a way home on the success screen"
```

---

### Task 8: Ordem do histórico

**Files:**
- Modify: `src/features/refunds/components/ReviewTimeline.tsx`
- Modify: `src/features/refunds/components/ReviewTimeline.test.tsx`
- Modify: `src/features/refunds/api/reviewQueries.ts` (só o comentário)

- [ ] **Step 1: Escrever o teste que falha**

**Antes de escrever o teste, saiba disto:** `refundReviewsFixture` em
`src/test/msw/handlers.ts` **não está em ordem cronológica** — é
`[approved 10:00, paid 14:20, rejected 09:00]`. UC-013 diz que a API devolve do
mais antigo para o mais novo, então a fixture compartilhada mocka um contrato
que ela mesma não honra. Usá-la aqui provaria a inversão do array, não "mais
recente primeiro", e as duas coisas só coincidem quando a entrada respeita o
contrato.

Por isso o teste usa uma resposta local, cronológica:

```tsx
// Most recent first. The response below is chronological — oldest to newest,
// which is what UC-013 says the API returns — so "renders the last entry
// first" and "renders the most recent first" are the same statement here.
// The shared refundReviewsFixture is NOT chronological, which is why this
// test does not use it.
it("shows the most recent decision first", async () => {
  server.use(
    http.get("*/refunds/:id/reviews", () =>
      HttpResponse.json({
        type: "RefundReview",
        count: 2,
        attributes: [
          {
            from_status: "pending",
            to_status: "approved",
            reason: null,
            reviewer: { id: 1, name: "Gabriel" },
            created_at: "2026-07-30T10:00:00.000Z",
          },
          {
            from_status: "approved",
            to_status: "paid",
            reason: null,
            reviewer: { id: 1, name: "Gabriel" },
            created_at: "2026-07-30T14:20:00.000Z",
          },
        ],
      })
    )
  );

  renderTimeline();

  const entries = await screen.findAllByRole("listitem");
  expect(entries[0]).toHaveTextContent("Pago");
  expect(entries[1]).toHaveTextContent("Aprovado");
});
```

**Depois** de o teste passar, verifique se algum outro teste depende da ordem
atual de `refundReviewsFixture` (`grep -rn "refundReviewsFixture" src`). Se
nenhum depender, reordene a fixture para ficar cronológica e acrescente um
comentário dizendo que a ordem espelha UC-013 — uma fixture que desrespeita o
contrato que finge mockar é uma armadilha para o próximo teste. Se algum
depender, **não** a reordene: relate como pendência e siga.

- [ ] **Step 2: Rodar e ver falhar**

Expected: FAIL — a primeira entrada é a mais antiga.

- [ ] **Step 3: Implementar**

```tsx
      {/* Exibido do mais recente para o mais antigo. Isto é ordem de
          APRESENTAÇÃO: a camada de dados (api/reviewQueries.ts) continua
          entregando o que a API mandou, sem reordenar por campo nenhum, e
          `toReversed` não muta o array em cache. */}
      <ol className="flex flex-col gap-3">
        {data.attributes.toReversed().map((review) => (
```

Use `toReversed()` (ES2023, disponível no alvo deste projeto) e **não** `.reverse()`, que mutaria o array dentro do cache do React Query.

Atualizar o comentário de `reviewQueries.ts`, que hoje diz que o chamador deve renderizar na ordem recebida: passa a dizer que a camada de dados não reordena e que a apresentação é decisão do componente.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/features/refunds/components/ReviewTimeline.test.tsx`
Expected: PASS

- [ ] **Step 5: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/features/refunds/components/ReviewTimeline.tsx \
        src/features/refunds/components/ReviewTimeline.test.tsx \
        src/features/refunds/api/reviewQueries.ts
git commit -m "feat(refunds): show the review history most recent first"
```

---

### Task 9: Alinhamento dos botões do sidebar

Sem teste automatizado: é alinhamento visual e o jsdom não calcula layout. Vai para o checklist de navegador.

**Files:**
- Modify: `src/components/core/Sidebar.tsx`

- [ ] **Step 1: Entender o que o `translate` fazia**

Leia `src/components/core/Sidebar.tsx:52-68`. Há `translate-x-2` em dois lugares: no `SidebarMenuButton` do item habilitado (linha 54) e no `div` que envolve o item desabilitado (linha 61). Ele existe para centralizar o ícone quando a sidebar está no modo trilho (`collapsible=icon`).

O problema: `translate` desloca a pintura mas **não** a caixa de layout. O fundo do hover acompanha a caixa, que continua onde estava — daí a faixa sem hover à esquerda.

- [ ] **Step 2: Trocar por padding**

Remover `translate-x-2` dos dois lugares. No `SidebarMenuButton` habilitado, acrescentar `pl-2` (o mesmo deslocamento, agora dentro da caixa) e, para o modo trilho, um override que devolva a centralização:

```
group-data-[collapsible=icon]:pl-0! group-data-[collapsible=icon]:justify-center
```

No `div` do item desabilitado, o mesmo `pl-2` no lugar do `translate-x-2`.

Verifique também o `bg-sidebar!` no `<Link>` interno (linha 55): ele pinta o link com a cor de fundo da sidebar, o que pode estar mascarando o hover do botão-pai. Se o hover não cobrir a linha inteira depois da mudança, esta é a próxima suspeita — **reporte antes de removê-lo**, porque foi uma escolha manual do Gabriel e pode existir por um motivo que não está escrito.

- [ ] **Step 3: Conferir que nada quebrou nos testes**

Run: `npx vitest run src/components/core/`
Expected: PASS — `Sidebar.test.tsx` não assere classes de alinhamento.

- [ ] **Step 4: Verificar e commitar**

```bash
npx vitest run && npx tsc -b --noEmit && npm run lint
git add src/components/core/Sidebar.tsx
git commit -m "fix(sidebar): align nav items with padding so hover fills the row"
```

---

### Task 10: Fechamento

**Files:**
- Modify: `../Refund-api/docs/plans/current-state.md`
- Modify: `../Refund-api/docs/learning-path-progress.md`

- [ ] **Step 1: Verificação completa**

```bash
npx vitest run && npx vitest run && npx vitest run
npx tsc -b --noEmit
npm run lint
npm run build
```

Três rodadas pelo flake conhecido do `ResizeObserver`. Registrar contagem de testes, de arquivos e o tamanho do bundle.

- [ ] **Step 2: Checklist de navegador (para o Gabriel)**

Escrever no relatório, não executar:

- [ ] Aprovar mantém o spinner até o histórico aparecer atualizado
- [ ] Rejeitar idem, e o motivo aparece no histórico
- [ ] Marcar como pago idem
- [ ] Excluir mantém o botão ocupado até a Home carregar
- [ ] Criar solicitação idem até a tela de sucesso
- [ ] Login mantém "Entrando…" até a Home aparecer
- [ ] Nenhum spinner demora a ponto de incomodar (ver a consequência do item 1 da spec)
- [ ] Card de pendentes do admin mostra o total global
- [ ] Filtrar por status **não** muda o card de pendentes
- [ ] Rótulo "Solicitações (Pago)" aparece com filtro ativo
- [ ] Histórico lista a decisão mais recente primeiro
- [ ] Sidebar: hover cobre a linha inteira, sem faixa à esquerda
- [ ] Sidebar no modo trilho: ícones centralizados
- [ ] Tela de sucesso: "Nova solicitação" reabre o diálogo **zerado**, sem sair da página
- [ ] Tela de sucesso: "Voltar para a Home" navega
- [ ] Cancelar o diálogo e reabrir traz o formulário limpo

- [ ] **Step 3: Documentação**

Em `current-state.md`: acrescentar o ciclo ao progresso com os números; registrar a consequência de esperar a invalidação inteira; registrar que a requisição do card de pendentes é uma a mais por carga da Home do admin.

Em `learning-path-progress.md`: entrada sobre o que se aprendeu — em especial que devolver a promise de um callback de mutation estende `isPending`, e a diferença entre esperar dados (React Query) e esperar a rota (React Router).

- [ ] **Step 4: Commitar a documentação**

```bash
cd ../Refund-api
git add docs/plans/current-state.md docs/learning-path-progress.md
git commit -m "docs: record the loading feedback and UI fixes cycle"
```

- [ ] **Step 5: Revisão da branch inteira**

Conferir por busca, não por leitura de intenção:

- os quatro hooks devolvem a promise (`grep -n "onSuccess" src/features/refunds/hooks/*.ts`) e nenhum teve o alvo de invalidação alterado;
- nenhum `.reverse()` sem `to` prefixado em dados vindos do cache;
- o card de pendentes não lê `data.total` da listagem em lugar nenhum;
- `useNavigation` só onde há navegação de verdade.

---

## Self-Review

**Cobertura da spec:** §1 → Tasks 1 e 2. §2 → Task 3. §3 → Task 4. §4 → Task 5. §5 → Task 6. §6 → Task 7. §7 → Task 8. §8 → Task 9. Testes e Verificação → distribuídos, consolidados na Task 10.

**Consistência de tipos:** `usePendingCount(enabled: boolean)` definido na Task 4 e consumido na mesma. `MainLayoutOutletContext` definido na Task 7 e consumido na mesma. O `pendingAction` da Task 2 é local ao componente. Nenhum símbolo é usado antes de ser definido.

**Dois erros corrigidos na auto-revisão, ambos por conferir em vez de assumir:**

1. A Task 8 afirmava que a primeira entrada renderizada seria "Pago" usando a
   fixture compartilhada. Ela **não é cronológica**
   (`[approved 10:00, paid 14:20, rejected 09:00]`), então inverter o array
   colocaria "Rejeitado" primeiro e o teste falharia mesmo com a implementação
   certa. A task passou a usar uma resposta local cronológica, e ganhou um passo
   para avaliar a correção da fixture compartilhada — que hoje mocka um contrato
   (UC-013, mais antigo primeiro) que ela mesma desrespeita.
2. Os rótulos de campo da Task 6 estavam marcados como ilustrativos; foram
   conferidos no código e agora são os reais.
