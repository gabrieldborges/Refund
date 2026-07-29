# Ciclo de feature — Contrato novo e comprovante autenticado

Spec do sexto ciclo de feature e do primeiro de frontend desde o restyle.
Escrita em 2026-07-29, no repositório `Refund-FrontEnd`.

Documentação canônica relacionada: [UC-003](../../../../Refund-api/docs/use-cases/UC-003-create-refund.md),
[UC-004](../../../../Refund-api/docs/use-cases/UC-004-list-refunds.md),
[UC-005](../../../../Refund-api/docs/use-cases/UC-005-view-refund.md),
[UC-010](../../../../Refund-api/docs/use-cases/UC-010-download-receipt.md).

## Motivação

Três ciclos de backend mudaram o contrato das respostas de reembolso. O
frontend na `main` **não consegue consumir a API nova**: o Zod declara `user_id`
e `filename` como obrigatórios, e os dois deixaram de existir. Enquanto isso não
for absorvido, os dois repositórios não podem ser implantados.

Este ciclo faz o mínimo para o app voltar a funcionar contra a API atual — e
nada além disso. As funcionalidades que o backend novo habilita (workflow de
aprovação na tela, TanStack Table, foto de perfil) ficam para ciclos próprios.

## Recorte e por que ele existe

O backlog herdado descrevia cinco frentes. Elas foram decompostas no
brainstorming porque só a primeira é obrigatória, e porque o TanStack Table é um
item da trilha por si só — diluí-lo num pacote de cinco frentes contraria o
"um item por vez" do
[fluxo da trilha](../../../../Refund-api/docs/plans/learning-path-workflow.md).

| Frente | Neste ciclo? |
| --- | --- |
| A. Contrato + arquivos autenticados | **sim** |
| B. Workflow de aprovação na UI | não — ciclo próprio |
| C. TanStack Table + toolbar (Item 13) | não — ciclo próprio |
| D. Foto de perfil (upload e exibição) | não — ciclo próprio |
| E. Ajustes pequenos acumulados | **sim** |

## Item da trilha

Este ciclo não abre um item novo. Ele **fecha uma lacuna do Item 2 (schemas como
fronteira)**: aquele item foi restrito a responses HTTP e deixou de fora a
sessão persistida em `localStorage`, que até hoje usa type assertion. A seção
"Sessão persistida validada" resolve isso.

O **Item 11 (error boundaries)** foi considerado e deixado de fora: o
`ReceiptPreview` trata seu próprio erro localmente, e um error boundary sem uma
segunda tela de dados para proteger seria abstração prematura.

## Estado atual

O contrato que o frontend espera hoje, em
`src/features/refunds/schemas/refund.ts`:

```ts
const refundBaseSchema = z.object({
  id, user_id, name, category, amount_in_cents, filename,
});
export const refundSchema = refundBaseSchema.extend({ created_at });
export const refundCreateResponseSchema = z.object({
  type, count: z.literal(1), attributes: refundBaseSchema,
});
```

`src/context/auth-context.ts` guarda `{ name, email, role }` — sem `id`.
`src/lib/api.ts` monta a URL pública do comprovante com `getReceiptUrl`.
`src/pages/PageRefundDetails.tsx` usa essa URL num `<a href target="_blank">`.

## Contrato novo, confirmado no código

Verificado em `src/controllers/refund_serializer.py` e
`src/controllers/user_login_controller.py`, na ponta de
`feat/authenticated-file-serving`.

Listagem, detalhe e criação produzem **a mesma forma**:

```jsonc
{
  "id": 1,
  "name": "Almoço com cliente",
  "category": "food",
  "amount_in_cents": 4500,
  "status": "pending",          // novo
  "created_at": "2026-07-29T…", // agora presente também na criação
  "user": { "id": 13, "name": "Gabriel", "has_avatar": false }
}
```

Login: `{ id, access, name, email, role, avatar_filename, token }`.

| Antes | Agora |
| --- | --- |
| `user_id: 13` no topo | `user: { id, name, has_avatar }` |
| `filename: "abc.jpg"` | não existe — arquivo vem por rota própria |
| sem `status` | `pending` \| `approved` \| `rejected` |
| criação sem `created_at` | criação com `created_at` |
| login sem `id` | login com `id` |

## Custo de não mudar

O `.parse` do Zod falha em **toda** listagem. `useRefunds` cai em `isError` e a
Home mostra "Não foi possível carregar as solicitações" para todo usuário — a
tela principal do produto fica inutilizável. O mesmo vale para o detalhe e a
criação.

Não existe ordem de deploy segura: um backend novo com frontend velho quebra, e
um frontend novo com backend velho quebra igual. Os dois têm de ir juntos.

## Decisões travadas no brainstorming

1. **`user.name` e `user.has_avatar` são absorvidos nos schemas, mas nenhuma
   tela nova os renderiza.** Hoje nada na UI exibe avatar (o Sidebar mostra
   iniciais; a lista, ícone de categoria). Exibir foto antes de existir upload
   custaria N requisições autenticadas por página, sem cache do browser, para
   mostrar algo que ninguém consegue definir ainda. Exibição vai junto com o
   ciclo D.
2. **O comprovante vira preview embutido no card, com botão de tela cheia.**
   Alternativa considerada e recusada: manter "abrir em nova aba", que seria
   menos código mas adiaria o preview que o produto já pede.
3. **A pilha de backend é mesclada no início do ciclo.** Fast-forward de
   `feat/authenticated-file-serving` para a `main` do `Refund-api` antes de
   tocar no frontend, para que exista um contrato único durante todo o
   desenvolvimento e a validação manual.
4. **O Blob é cacheado pelo TanStack Query; a object URL pertence ao
   componente.** Detalhado abaixo.
5. **Badge de status é somente leitura.** Aprovar e rejeitar são o ciclo B.

## Correção ao `current-state.md`

O documento afirma que o ciclo do workflow de aprovação "ainda não foi
mesclado". **Ele já está na `main`** do `Refund-api` (merge `177f929`). O que
permanece fora da `main` é apenas a pilha `feat/refund-query-and-avatar` →
`feat/authenticated-file-serving` (33 commits, fast-forward possível).

Consequência: a `main` do backend **já devolve `status`** na listagem, e isso
nunca quebrou o frontend porque o Zod descarta chaves desconhecidas por padrão.
A quebra real vem só da pilha não mesclada. O `current-state.md` deve ser
corrigido no fechamento deste ciclo.

## Schemas

### Reembolso

```ts
const refundUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
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
```

- `refundBaseSchema` é removido: existia só para separar a base de `created_at`.
- **`refundCreateResponseSchema` é removido.** Ele nasceu no Item 2 com um
  comentário explicando que a criação não devolvia `created_at`; o backend
  passou a reler a linha gravada e essa razão evaporou.
  `refundDetailResponseSchema` é renomeado para `refundResponseSchema` e passa a
  servir detalhe **e** criação. Quando o backend remove uma divergência, o
  frontend remove a compensação — não a mantém "por segurança".
- `refundsListResponseSchema` muda apenas no `attributes`; os metadados
  (`count`, `total`, `sum_amount_in_cents`, `page`, `per_page`, `total_pages`)
  seguem iguais.
- `refundCreateSchema` (o formulário) **não muda**.

### Autenticação

```ts
export const loginResponseSchema = z.object({
  access: z.literal(true),
  id: z.number().int().positive(),   // novo
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["standard", "admin"]),
  token: z.string().min(1),
});
```

`avatar_filename` fica **deliberadamente fora**: o Zod descarta chaves
desconhecidas e, sem renderizar avatar neste ciclo, o campo não tem consumidor.
A inconsistência do backend (`avatar_filename` cru no login contra `has_avatar`
nos reembolsos) permanece registrada como decisão em aberto para o ciclo D.

`AuthUser` em `src/context/auth-context.ts` ganha `id: number`.

## Sessão persistida validada

`loadStoredUser` em `src/context/AuthContext.tsx` deixa de usar
`JSON.parse(raw) as AuthUser` e passa a validar com um `storedUserSchema`
(mesma forma do `AuthUser`), via `safeParse`. Falha de parse devolve `null`, e a
sessão é tratada como inexistente.

> **Efeito observável no deploy: todos os usuários logados são deslogados uma
> vez.** Sessões salvas hoje não têm `id`, então falham no parse. Não é bug — é
> a consequência correta de exigir um campo novo, e é preferível ao
> comportamento atual, em que um objeto de forma errada passa direto e só quebra
> mais tarde, longe da causa.

## Comprovante autenticado

O arquivo deixou de ser público. `GET /refunds/{id}/receipt` exige o token e
responde binário; `getReceiptUrl` é removido de `src/lib/api.ts`.

### Divisão de responsabilidades

```
receiptQuery(id)      features/refunds/api/refundQueries.ts   → cacheia o Blob
useObjectUrl(blob)    src/hooks/useObjectUrl.ts   (shared)    → cria/revoga a URL
ReceiptPreview        features/refunds/components/            → decide a renderização
```

Assinatura do hook: `useObjectUrl(blob: Blob | undefined): string | null` —
devolve `null` enquanto não há Blob, para que o chamador não precise distinguir
"ainda carregando" de "sem arquivo" por um valor mágico.

**Por que o cache guarda o `Blob` e não a URL.** Um blob URL é um recurso que
precisa ser liberado com `revokeObjectURL`. Se a URL fosse o valor cacheado, o
garbage collector do TanStack Query poderia descartar a entrada com a URL ainda
em uso na tela — imagem quebrada — ou mantê-la viva sem nunca revogar —
vazamento de memória. Cacheando os **bytes**, cada componente que monta cria a
sua própria URL e a revoga no cleanup: o ciclo de vida fica colado ao
componente, que é onde ele pertence, enquanto os bytes seguem reaproveitados
pelo cache.

**Por que o hook genérico mora em `src/hooks/` e não na feature.** O ciclo D vai
precisar do mesmo hook para as fotos de perfil, e o `eslint-plugin-boundaries`
do Item 9 proíbe uma feature de importar de outra. Nascendo em
`features/refunds`, o ciclo D esbarraria no lint. `useObjectUrl` é genérico — só
converte `Blob` em URL — e a parte autenticada é responsabilidade da query.

### `receiptQuery`

- Chave: `refundKeys.receipt(id)` → `["refunds", "receipt", id]`, dentro da
  hierarquia existente.
- `queryFn`: `api.get(path, { responseType: "blob", signal })`, devolvendo o
  `Blob`.
- **Sem Zod, por um motivo legítimo:** as outras queries validam JSON; aqui a
  fronteira já é o `Content-Type`, derivado pelo backend da extensão armazenada
  e interpretado pelo browser. Não há estrutura a parsear. Isso fica escrito
  para não parecer esquecimento.
- **Não é invalidada na exclusão.** `useDeleteRefund` invalida
  `refundKeys.lists()` justamente para não rebuscar o detalhe de um item
  apagado; o comprovante segue a mesma regra.

### `ReceiptPreview`

- **O tipo do arquivo vem de graça:** `blob.type` carrega o `Content-Type` que
  o backend derivou da extensão. `startsWith("image/")` → `<img>`; caso
  contrário → `<object type="application/pdf">` com link de fallback dentro.
  Nenhum campo novo é necessário no contrato.
- Estados: `Skeleton` enquanto pendente, mensagem de erro em `isError`
  (`role="alert"`), conteúdo quando resolvido.
- Tela cheia: `Dialog` do `src/components/ui`, com título acessível.
- **Uma URL, um dono:** o `ReceiptPreview` cria a object URL e passa a mesma
  string para o Dialog. O Dialog não cria a sua — dois donos de um recurso que
  precisa ser revogado é como se produz uma imagem quebrada intermitente.
- `alt` da imagem descreve o comprovante pelo nome da solicitação.

## Badge de status

`features/refunds/constants/status.ts` mapeia os três estados para rótulo em
português e uma variante **já existente** do `ui/badge` — nenhum token de cor
novo é criado:

| Status | Rótulo | Variante |
| --- | --- | --- |
| `pending` | Pendente | `secondary` |
| `approved` | Aprovado | `default` |
| `rejected` | Rejeitado | `destructive` |

Renderizado na linha da Home e no cabeçalho do card de detalhe, **somente
leitura**. Aprovar e rejeitar são o ciclo B.

## Ajustes pequenos

- **`per_page` unificado em `REFUNDS_PER_PAGE = 10`.** Hoje o número está
  escrito em dois lugares que podem divergir em silêncio:
  `src/router-loaders.ts` e o default de
  `src/features/refunds/hooks/useRefunds.ts`. A constante passa a ser definida
  na feature (`src/features/refunds/constants/pagination.ts`) e **exportada pela
  fachada** `src/features/refunds/index.ts`; o loader importa dela e o hook a usa
  como default. Exportar pela fachada é obrigatório, não estilo: o
  `router-loaders.ts` está na camada `app` e o Item 9 proíbe alcançar o interior
  de uma feature.
- **Asserção vazia em `src/pages/PageHome.test.tsx`.** A metade do teste que diz
  "reseta a página para 1" não pode falhar, porque a fixture nunca começa com
  `page>=2`. Correção: iniciar o router em `page=2`, digitar na busca e afirmar
  que o parâmetro `page` sai da URL — cobrindo de verdade o ramo de
  `updateListLocation`.

## Testes

Os testes de integração via MSW vão **quebrar em massa** quando os handlers
forem atualizados para o contrato novo. Isso é o resultado desejado, não um
problema: é a prova de que o Item 5 está fazendo o trabalho dele.

- `src/test/msw/handlers.ts`: respostas de login, lista, detalhe e criação na
  forma nova; handler novo para `GET /refunds/:id/receipt` devolvendo binário.
- `src/hooks/useObjectUrl.test.ts`: cria a URL a partir do Blob e **revoga no
  unmount**.
- `src/features/refunds/components/ReceiptPreview.test.tsx`: imagem, PDF e
  estado de erro.
- `src/features/refunds/schemas/refund.test.ts`: forma nova; um payload com
  `user_id` no topo deve ser rejeitado.
- `src/context/AuthContext.test.tsx` (novo): uma sessão persistida sem `id` é
  rejeitada e o app parte deslogado; uma sessão válida é restaurada.
- `src/pages/PageHome.test.tsx`: a asserção vazia, conforme acima.

> **Infraestrutura transversal, sinalizada antes de introduzir.** O jsdom não
> implementa `URL.createObjectURL` nem `URL.revokeObjectURL`. Será preciso um
> stub em `src/test/setup.ts`, no mesmo padrão guardado por `if (!…)` dos
> polyfills de `matchMedia` e Pointer Capture que já existem. O `AGENTS.md` pede
> alinhar infraestrutura transversal de teste **antes** de introduzi-la, e o
> `current-state.md` registra que na última vez isso foi sinalizado depois do
> fato.

## Backend (`Refund-api`)

Nenhuma mudança de código. Duas ações:

1. Fast-forward de `feat/authenticated-file-serving` para a `main`, no início do
   ciclo.
2. `pytest` e `pylint src` como sanidade pós-merge (178 testes verdes e 10.00/10
   na ponta da branch).

A atualização do `current-state.md` e do `learning-path-progress.md` acontece no
fechamento, incluindo a correção sobre o merge do workflow de aprovação.

## Verificação

No `Refund-FrontEnd`:

```bash
npm run test
npx tsc -b --noEmit
npm run lint      # régua: 0 erros, 0 warnings (atingida no restyle)
npm run build
```

No `Refund-api`, após o fast-forward: `pytest` e `pylint src`.

Validação manual no navegador contra a API real, cobrindo no mínimo:

- login, listagem, detalhe e criação sem erro de parse do Zod — o que também
  **fecha a pendência "Aberto 1/4"** do `current-state.md`, o runtime do Item 2
  contra a API real;
- o logout forçado da sessão antiga, no primeiro carregamento após o deploy;
- preview de comprovante em imagem **e** em PDF, incluindo tela cheia;
- badge de status nos três valores;
- 404 do comprovante de outro usuário (não deve vazar bytes nem quebrar a tela).

## Deploy

**Conjunto e obrigatório.** Não existe ordem segura: backend novo com frontend
velho falha o `.parse` de toda listagem, e o inverso falha igual, porque o
frontend novo passa a exigir `user`. Se o deploy simultâneo não for viável, a
alternativa é uma versão de transição no backend devolvendo `user_id` **e**
`user`, removendo `user_id` só depois.

## Documentação e commits

- Implementação em branch própria do `Refund-FrontEnd`.
- Fechamento atualiza `learning-path-progress.md` e `current-state.md` no
  `Refund-api`, com a correção sobre o merge do workflow de aprovação e a baixa
  da pendência "Aberto 1/4".
- Commits separados por repositório, descrevendo a responsabilidade de cada um.

## Fora deste ciclo

- **Workflow de aprovação na UI** (ciclo B): rota de revisão só para admin,
  aprovar/rejeitar com motivo obrigatório na rejeição, terceiro card na faixa de
  resumo.
- **TanStack Table com toolbar** (ciclo C, Item 13): filtro por `status`,
  ordenação por `sort`/`order` server-side.
- **Foto de perfil** (ciclo D): upload, remoção, gradiente padrão, exibição de
  avatar no Sidebar e na lista — e a decisão sobre `avatar_filename` cru nas
  respostas de login e de avatar.
- **Rota dedicada de comprovante** (`/refunds/:id/receipt`): o Dialog de tela
  cheia resolve a necessidade sem uma rota nova.
- **Migrar o Auth Context para Zustand**: segue fora de escopo.

## Roadmap atualizado dos ciclos

1. ~~Shell — sidebar + tema.~~ concluído
2. ~~Restyle com shadcn/ui.~~ concluído
3. ~~Workflow de aprovação (backend).~~ concluído
4. ~~Consulta da listagem e foto de perfil (backend).~~ concluído
5. ~~Servir arquivos com autenticação (backend).~~ concluído
6. **(este) Contrato novo e comprovante autenticado (frontend).**
7. Workflow de aprovação na UI.
8. Lista de reembolsos com TanStack Table (Item 13).
9. Foto de perfil (upload e exibição).
10. Dashboard + calendário.
11. Página de time/organização.
12. Fórum e mensagens.
