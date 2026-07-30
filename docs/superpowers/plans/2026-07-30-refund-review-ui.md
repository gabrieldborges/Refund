# Workflow de aprovação na UI — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar consumidor ao que o ciclo de backend entregou — pagamento, histórico e estatísticas — e fechar a incompatibilidade ativa do status `paid`.

**Architecture:** Tudo de reembolso entra em `src/features/refunds/` atrás da fachada `index.ts`; a tela de revisão é uma página fina em `src/pages/`. Autorização de UI vive nos loaders do React Router, antes do render.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind 4, shadcn/ui, React Router 7 (data mode), TanStack Query, Zod, react-hook-form, Vitest + Testing Library + MSW.

## Global Constraints

- Spec deste ciclo: [`2026-07-30-refund-review-ui-design.md`](../specs/2026-07-30-refund-review-ui-design.md). Em divergência, a spec vence.
- **Ponto de partida medido:** `npm run test` 103 verdes em 31 arquivos · `npx tsc -b --noEmit` exit 0 · `npm run lint` **0 erros, 0 warnings** · o aviso de chunk > 500 kB no `build` é **pré-existente**.
- Textos de UI em **português**; código, identificadores e comentários de teste em **inglês** (`AGENTS.md`).
- Componentes de design system vêm do registry (`npx shadcn@latest add`). **Depois de cada uso do CLI:** mover os arquivos para `src/components/ui`, apagar o diretório `./@` que ele cria na raiz, e conferir `git diff src/index.css` — o CLI acrescenta um bloco `.dark { … }` com o seletor errado para este projeto.
- **Não regenerar `src/components/ui/sidebar.tsx`** — ele foi editado à mão para remover uma escrita de cookie; o CLI a reintroduz.
- Imports usam o alias `@/`. O `eslint-plugin-boundaries` recusa import ao interior de uma feature: consuma sempre pela fachada.
- `npx tsc -b --noEmit` depois de qualquer mudança.
- Branch: `feat/refund-review-ui` (criada, spec commitada em `15fd929`).

## Estrutura de arquivos

**Criar** (em `src/features/refunds/`, salvo indicado):

| Arquivo | Responsabilidade |
|---|---|
| `api/reviewQueries.ts` | `refundReviewsQuery`, `refundStatsQuery` |
| `hooks/useRefundReviews.ts` | Histórico de um reembolso |
| `hooks/useRefundStats.ts` | Estatísticas de um usuário |
| `hooks/useReviewRefund.ts` | Mutation de aprovar/rejeitar |
| `hooks/usePayRefund.ts` | Mutation de pagar (multipart) |
| `components/ReviewDecision.tsx` | Botões por status + diálogo de rejeição |
| `components/PayRefundDialog.tsx` | Upload do comprovante de pagamento |
| `components/ReviewTimeline.tsx` | Linha do tempo do histórico |
| `components/RequesterPanel.tsx` | Perfil, contadores e lista do solicitante |
| `src/pages/PageRefundReview.tsx` | Casca da tela de revisão |

**Modificar:** `schemas/refund.ts`, `constants/status.ts`, `index.ts` (fachada), `src/router.tsx`, `src/router-loaders.ts`, `src/pages/PageHome.tsx`, `src/pages/PageRefundDetails.tsx`, `src/test/msw/handlers.ts`.

---

### Task 1: Absorver o contrato novo

**Files:**
- Modify: `src/features/refunds/schemas/refund.ts`, `src/features/refunds/constants/status.ts`, `src/test/msw/handlers.ts`
- Test: `src/features/refunds/schemas/refund.test.ts`, `src/features/refunds/constants/status.test.ts`

**Interfaces:**
- Produces: `RefundStatus` inclui `"paid"`; `refundReviewSchema`, `refundStatsSchema` e seus tipos; `REFUND_STATUS.paid`.

- [ ] **Step 1: Escrever o teste que falha**

Em `src/features/refunds/schemas/refund.test.ts`:

```ts
// The break this cycle exists to fix: the API started returning "paid" and the
// enum did not have it, so every list containing a paid refund failed to parse
// and the Home showed an error to every user.
it("accepts a refund whose status is paid", () => {
  const parsed = refundSchema.parse({ ...validRefund, status: "paid" });
  expect(parsed.status).toBe("paid");
});

it("rejects a status the API never sends", () => {
  expect(() => refundSchema.parse({ ...validRefund, status: "archived" })).toThrow();
});
```

Use o fixture já existente no arquivo como `validRefund`; se não houver, monte um a partir de `refundFixture` de `src/test/msw/handlers.ts`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/features/refunds/schemas/refund.test.ts`
Expected: FAIL no primeiro teste — `Invalid enum value`.

- [ ] **Step 3: Ampliar o enum e acrescentar os schemas novos**

Em `schemas/refund.ts`:

```ts
export const refundStatusSchema = z.enum(["pending", "approved", "rejected", "paid"]);
```

E, ao fim do arquivo:

```ts
// A decisão registrada no histórico. `reason` é nullable porque só a rejeição
// exige justificativa (BR-018) — aprovação e pagamento gravam null.
export const refundReviewSchema = z.object({
  from_status: refundStatusSchema,
  to_status: refundStatusSchema,
  reason: z.string().nullable(),
  reviewer: z.object({ id: z.number().int().positive(), name: z.string().min(1) }),
  created_at: z.string(),
});

export const refundReviewsResponseSchema = z.object({
  type: z.literal("RefundReview"),
  count: z.number().int().nonnegative(),
  attributes: z.array(refundReviewSchema),
});

const statusTotalsSchema = z.object({
  count: z.number().int().nonnegative(),
  amount_in_cents: z.number().int().nonnegative(),
});

// Sem total geral, de propósito: somar os quatro status juntaria previsão,
// passivo, despesa liquidada e nada. Quem precisar de uma manchete soma as
// contagens no cliente.
export const refundStatsResponseSchema = z.object({
  type: z.literal("RefundStats"),
  user_id: z.number().int().positive(),
  by_status: z.object({
    pending: statusTotalsSchema,
    approved: statusTotalsSchema,
    paid: statusTotalsSchema,
    rejected: statusTotalsSchema,
  }),
});

export type RefundReview = z.output<typeof refundReviewSchema>;
export type RefundStats = z.output<typeof refundStatsResponseSchema>;
```

- [ ] **Step 4: Acrescentar a quarta entrada de `REFUND_STATUS`**

Em `constants/status.ts`, acrescente ao `Record` e amplie o tipo da variante:

```ts
  paid: { label: "Pago", variant: "outline" },
```

O tipo passa a ser `"default" | "secondary" | "destructive" | "outline"`.
`outline` já existe em `src/components/ui/badge.tsx` — nenhum token de cor novo,
igual às outras três.

**O `Record<RefundStatus, …>` é a rede de segurança aqui:** omitir a entrada não
compila. Confirme rodando `npx tsc -b --noEmit` **antes** de acrescentá-la e
vendo o erro.

- [ ] **Step 5: Acrescentar os handlers MSW**

Em `src/test/msw/handlers.ts`, exporte fixtures e handlers para
`GET */refunds/:id/reviews` e `GET */users/:id/refund-stats`, no padrão dos
existentes. O fixture do histórico deve incluir **uma rejeição com `reason` não
nulo** — um fixture só de nulos não distingue "passou adiante" de "foi
descartado".

- [ ] **Step 6: Verificar**

Run: `npx vitest run && npx tsc -b --noEmit && npm run lint`
Expected: todos verdes; 0 erros de lint.

- [ ] **Step 7: Commit**

```bash
git add src/features/refunds/ src/test/msw/handlers.ts
git commit -m "feat: absorb the paid status and the review/stats contracts"
```

---

### Task 2: Corrigir o card Total e acrescentar o terceiro card

**Files:**
- Create: `src/features/refunds/api/reviewQueries.ts`, `src/features/refunds/hooks/useRefundStats.ts`
- Modify: `src/features/refunds/index.ts`, `src/pages/PageHome.tsx`
- Test: `src/pages/PageHome.test.tsx`

**Interfaces:**
- Consumes: `refundStatsResponseSchema` (Task 1).
- Produces: `refundStatsQuery(userId)`, `useRefundStats(userId)`, exportados pela fachada.

- [ ] **Step 1: Escrever `refundStatsQuery` e o hook**

Em `api/reviewQueries.ts`, no padrão de `refundQueries.ts` (`queryOptions`,
`AbortSignal`, `.parse` do Zod). Acrescente a chave em `refundKeys`:

```ts
  stats: (userId: number) => [...refundKeys.all, "stats", userId] as const,
```

- [ ] **Step 2: Escrever o teste que falha**

O card "Total" hoje mostra a soma de todos os status. O teste deve provar que
ele passa a mostrar apenas `approved + paid`, e que existe um card "Pendentes"
com a contagem.

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/pages/PageHome.test.tsx`

- [ ] **Step 4: Implementar**

`PageHome` consome `useRefundStats(user.id)` para os cards. O card de dinheiro
passa a somar `by_status.approved.amount_in_cents + by_status.paid.amount_in_cents`,
com rótulo **"Aprovado + pago"** — o rótulo carrega o significado, que é a
regra do ciclo de backend.

**Para o admin o número é diferente e honesto:** ele vê a lista de todo mundo,
mas `refund-stats` é por usuário. Enquanto não existir agregado global, o admin
vê **"Solicitado"** com o `sum_amount_in_cents` da listagem, e um comentário no
código registra por quê. Não invente N requisições para contornar.

- [ ] **Step 5: Verificar e commitar**

```bash
git add src/features/refunds/ src/pages/PageHome.tsx
git commit -m "fix: stop the Home total from summing across statuses"
```

---

### Task 3: Rota de revisão e sua guarda

**Files:**
- Create: `src/pages/PageRefundReview.tsx`
- Modify: `src/router.tsx`, `src/router-loaders.ts`
- Test: `src/router-loaders.test.ts`

**Interfaces:**
- Produces: rota `/refunds/:id/review`; `reviewLoader`.

- [ ] **Step 1: Escrever os testes que falham**

Três casos, todos no `router-loaders.test.ts` seguindo o padrão do arquivo:

```ts
// UI authorization is usability, not security — the backend's 403/404 is what
// protects the data. The loader simply avoids offering what would be refused.
it("redirects a standard user away from the review route", async () => { /* … */ });
it("redirects an admin away from reviewing their own refund", async () => { /* … */ });
it("lets an admin review someone else's refund", async () => { /* … */ });
```

- [ ] **Step 2: Rodar e ver falhar**

- [ ] **Step 3: Implementar o loader**

Em `router-loaders.ts`:

```ts
export async function reviewLoader({ params }: LoaderFunctionArgs) {
  requireSession();

  if (!params.id) {
    throw new Response("Refund ID is required", { status: 400 });
  }

  const refund = await queryClient.ensureQueryData(refundDetailQuery(params.id));
  const session = readStoredUser();

  // Guard in the loader, not the component: the decision happens before any
  // render. This is USABILITY, not security — the API answers 403/404 on its
  // own. The UI just does not offer what would be refused.
  if (session?.role !== "admin" || refund.user.id === session.id) {
    throw redirect(`/refunds/${params.id}`);
  }

  return { id: params.id };
}
```

`requireSession` hoje valida e descarta; extraia dele um `readStoredUser()` que
devolve a sessão já validada por `storedUserSchema`, para não duplicar o parse.

- [ ] **Step 4: Registrar a rota**

Em `router.tsx`, dentro do `MainLayout`, **antes** de nada que possa capturá-la:

```tsx
{
  path: "/refunds/:id/review",
  loader: reviewLoader,
  handle: { title: "Revisar solicitação" },
  lazy: async () => ({ Component: (await import("./pages/PageRefundReview")).default }),
},
```

- [ ] **Step 5: Provar que a guarda pode falhar**

Remova a condição do papel, veja os testes vermelhos, restaure, veja verde.
Cole as duas saídas. Uma guarda que ninguém viu falhar ainda não é uma guarda.

- [ ] **Step 6: Verificar e commitar**

---

### Task 4: Destino do clique na Home

**Files:**
- Modify: `src/pages/PageHome.tsx`
- Test: `src/pages/PageHome.test.tsx`

- [ ] **Step 1: Teste que falha** — o `href` da linha é `/refunds/:id/review` para admin vendo solicitação alheia, e `/refunds/:id` nos demais casos (standard sempre; admin na própria).

- [ ] **Step 2: Implementar**

```tsx
const canReview = user?.role === "admin" && refund.user.id !== user.id;
const href = canReview ? `/refunds/${refund.id}/review` : `/refunds/${refund.id}`;
```

Espelha a BR-016 na navegação: a UI nunca oferece o que o backend recusaria.

- [ ] **Step 3: Verificar e commitar**

---

### Task 5: Aprovar e rejeitar

**Files:**
- Create: `src/features/refunds/hooks/useReviewRefund.ts`, `src/features/refunds/components/ReviewDecision.tsx`
- Modify: `src/features/refunds/index.ts`, `src/pages/PageRefundReview.tsx`
- Test: `src/features/refunds/components/ReviewDecision.test.tsx`

- [ ] **Step 1: Testes que falham**

Cobrir a tabela de estados da spec (`pending` → dois botões; `approved` →
Rejeitar + Marcar como pago; `rejected` → Aprovar; `paid` → nenhum), e que
confirmar a rejeição **sem motivo** não dispara a mutation.

- [ ] **Step 2: Implementar o hook**

`useReviewRefund` faz `PATCH /refunds/{id}/status` com `{ status, reason? }` e,
no `onSuccess`, invalida `refundKeys.all` com `refetchType: "all"` — a Home
está inativa quando se revisa, e o padrão `"active"` deixaria a lista velha por
até o `staleTime`. Mesmo raciocínio já documentado em `useDeleteRefund`.

**Não consumir o corpo da resposta.** O `PATCH` devolve um formato divergente
(`user_id` no topo, sem `user` aninhado) — decisão registrada no UC-007. Invalidar
e refazer o `GET` é o caminho escolhido.

- [ ] **Step 3: Implementar o componente**

Botões condicionados; o do status vigente **não é renderizado** — assim o `422`
de "já está nesse status" fica impossível de disparar pela UI. Rejeitar abre
`Dialog` com `Textarea` obrigatória validada por Zod, no padrão do diálogo de
exclusão em `PageRefundDetails.tsx`.

Se `ui/textarea.tsx` não existir, traga-o do registry e siga as regras do CLI
nas Global Constraints.

- [ ] **Step 4: Verificar e commitar**

---

### Task 6: Marcar como pago

**Files:**
- Create: `src/features/refunds/hooks/usePayRefund.ts`, `src/features/refunds/components/PayRefundDialog.tsx`
- Modify: fachada, `PageRefundReview.tsx`
- Test: `src/features/refunds/components/PayRefundDialog.test.tsx`

- [ ] **Step 1: Testes que falham** — arquivo de extensão inválida é recusado antes do envio; arquivo acima de 4MB idem; caminho feliz dispara a mutation.

**Detalhe aprendido na suíte:** `userEvent.upload` respeita o atributo `accept`
como um seletor real — um arquivo de extensão errada é descartado antes de
chegar ao `FileList`. Testes de rejeição por conteúdo precisam usar extensão
válida e tamanho inválido.

- [ ] **Step 2: Implementar**

`POST /refunds/{id}/payment` com `FormData`. As regras de validação são as
mesmas do `refundCreateSchema` (`.jpg/.jpeg/.png/.pdf`, 4MB) — extraia-as para
uma constante compartilhada dentro da feature em vez de duplicar os literais.

Reusa `src/components/ui/input-file.tsx`, que é componente autoral do projeto.

- [ ] **Step 3: Verificar e commitar**

---

### Task 7: Linha do tempo do histórico

**Files:**
- Create: `src/features/refunds/hooks/useRefundReviews.ts`, `src/features/refunds/components/ReviewTimeline.tsx`
- Modify: fachada, `PageRefundDetails.tsx`, `PageRefundReview.tsx`
- Test: `src/features/refunds/components/ReviewTimeline.test.tsx`

- [ ] **Step 1: Testes que falham** — uma rejeição mostra o motivo, o nome de quem decidiu e a data; uma solicitação nunca decidida (lista vazia) **não** renderiza a seção.

- [ ] **Step 2: Implementar**

Esta é a peça que fecha o loop do produto: até o ciclo de backend, o motivo da
rejeição era write-only e quem solicitou via só o badge. Aparece no detalhe
(para o dono) e na tela de revisão (para o admin).

- [ ] **Step 3: Verificar e commitar**

---

### Task 8: Comprovante de pagamento

**Files:**
- Modify: `src/features/refunds/api/refundQueries.ts`, `hooks/useReceipt.ts` ou um `usePaymentReceipt` irmão, `PageRefundDetails.tsx`, `PageRefundReview.tsx`
- Test: junto do componente

- [ ] **Step 1: Implementar** reusando `ReceiptPreview`, que já cuida do Blob, do object URL e da decisão imagem vs PDF por `blob.type`. Aparece só quando `status === "paid"`.

**Armadilha conhecida:** `ReceiptPreview` com `refundId=""` renderiza Skeleton
para sempre, porque uma query desabilitada do TanStack reporta `isPending: true`
indefinidamente. Garanta que o id existe antes de montar.

- [ ] **Step 2: Verificar e commitar**

---

### Task 9: Painel do solicitante

**Files:**
- Create: `src/features/refunds/components/RequesterPanel.tsx`
- Modify: fachada, `PageRefundReview.tsx`
- Test: `src/features/refunds/components/RequesterPanel.test.tsx`

- [ ] **Step 1: Testes que falham** — mostra os quatro contadores; a lista das solicitações do usuário é clicável e segue a mesma regra de destino da Task 4.

- [ ] **Step 2: Implementar**

Nome do solicitante, `useRefundStats(refund.user.id)` para os contadores, e
`useRefunds({ page: 1, perPage: REFUNDS_PER_PAGE, userId })` para a lista —
`refundListQuery` ganha o parâmetro `userId` opcional, repassado como
`user_id`.

Sem avatar: o upload não existe, então `has_avatar` é sempre `false` e o painel
mostraria só iniciais. Fica para o ciclo da foto de perfil.

Sem paginação: primeira página e um link para a Home filtrada.

- [ ] **Step 3: Verificar e commitar**

---

### Task 10: Documentação e fechamento

**Files:**
- Modify: `../Refund-api/docs/plans/current-state.md`, `../Refund-api/docs/learning-path-progress.md`

- [ ] **Step 1: Verificação final**

```bash
npm run test
npx tsc -b --noEmit
npm run lint
npm run build
```

Anote os números. Compare o tamanho do bundle com o ponto de partida — o aviso
de chunk > 500 kB é pré-existente e não deve ser atribuído a este ciclo.

- [ ] **Step 2: Atualizar a documentação canônica**

`current-state.md`: ciclo concluído, próximo ciclo, e as pendências novas —
a lacuna do agregado global por status, o avatar ainda sem consumidor, e o
deploy conjunto agora obrigatório por dois motivos (`user` aninhado e `paid`).

`learning-path-progress.md`: entrada do ciclo. O aprendizado que vale registrar
é que **um enum de três valores no cliente virou uma quebra total da tela
principal** quando o servidor ganhou o quarto — e que o `Record<RefundStatus, …>`
do TypeScript foi o que impediu a mesma classe de erro de se repetir nos rótulos.

- [ ] **Step 3: Commit**

## Auto-revisão do plano

**Cobertura da spec:** os dez itens de escopo têm task — 1→T1, 2 e 3→T2, 4→T3,
5→T4, 6→T5, 7→T6, 8→T7, 9→T8, 10→T9, mais T10 de fechamento.

**Consistência de tipos:** `RefundStatus` ganha `"paid"` em T1 e é consumido por
`REFUND_STATUS` (T1), pelos botões (T5) e pela linha do tempo (T7);
`refundStatsResponseSchema.by_status` tem as quatro chaves e é lido por T2 e T9;
`refundListQuery` ganha `userId` opcional em T9.

**Risco maior:** T1 é pré-requisito de tudo e conserta uma quebra ativa. Se algo
for cortado por tempo, cortar do fim para o começo — T9 é o mais separável.
