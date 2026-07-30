# Ciclo de feature — Workflow de aprovação na UI (frontend)

Data: 2026-07-30.
Repositório afetado: `Refund-FrontEnd`.
Sucede o ciclo de backend
[`2026-07-30-refund-payment-and-stats`](../../../Refund-api/docs/superpowers/specs/2026-07-30-refund-payment-and-stats-design.md),
já mesclado na `main` do `Refund-api`.

Este ciclo segue o
[fluxo permanente da trilha](../../../Refund-api/docs/plans/learning-path-workflow.md).

## Motivação

O ciclo de backend entregou pagamento, histórico de revisões e estatísticas por
status. Nada disso tem consumidor. E há uma urgência que não existia quando o
backlog foi escrito:

**O frontend atual quebra contra o backend atual.**
`src/features/refunds/schemas/refund.ts:33` declara

```ts
export const refundStatusSchema = z.enum(["pending", "approved", "rejected"]);
```

O backend agora devolve `status: "paid"`. O `.parse` falha, `useRefunds` cai em
`isError` e a Home mostra "Não foi possível carregar as solicitações" — para
todo usuário, assim que existir um único reembolso pago. Isso não é uma melhoria
pendente; é uma incompatibilidade ativa.

Além disso, o card "Total" da Home soma `amount_in_cents` de **todos** os
status. Com `paid` existindo, ele passa a somar previsão + passivo + despesa
liquidada + nada. O ciclo de backend estabeleceu o princípio — *nenhum agregado
monetário sem status declarado* — e a correção do card é a contraparte dele
aqui.

## Decisões herdadas do brainstorming

Estas foram tomadas com o Gabriel antes do ciclo de backend e **não se reabrem**:

| Decisão | Escolha |
|---|---|
| Onde vivem as ações de revisão | Rota dedicada `/refunds/:id/review`, não a página de detalhe |
| Destino do clique na Home | Depende do dono: alheia → `/review`; própria → detalhe normal |
| Guarda de quem não pode revisar | `redirect` para `/refunds/:id`, sem tela de erro |
| Como a decisão é registrada | Dois botões; rejeitar abre `Dialog` com textarea obrigatória |
| Botão do status atual | Ausente, não desabilitado |
| Corpo do `PATCH` | Não consumido; invalida a query e refaz o `GET` |

## Decisões novas deste ciclo

| Decisão | Escolha | Razão |
|---|---|---|
| Variante do badge para `paid` | `outline` | `badge.tsx` já a tem; nenhum token novo, como as outras três |
| Card "Total" | Passa a somar só `approved` + `paid` | Passivo + liquidado é a única soma com significado |
| Terceiro card | "Pendentes", com contagem | Responde "o que exige ação minha" |
| Pagamento na UI | Entra neste ciclo | O backend o entregou; sem ele o workflow para na aprovação |
| Painel do solicitante | Entra, por último | Foi requisito explícito do Gabriel |

## Escopo, em ordem de risco

A ordem não é arbitrária: o item 1 conserta uma quebra ativa e tudo depende
dele.

### 1. Absorver o contrato

`refundStatusSchema` ganha `"paid"`. `REFUND_STATUS` ganha a quarta entrada
(`{ label: "Pago", variant: "outline" }`). O `Record<RefundStatus, …>` do
TypeScript **força** essa quarta entrada — omitir não compila, o que é a rede de
segurança certa para este tipo de mudança.

Schemas novos:

- `refundReviewSchema` — `from_status`, `to_status`, `reason` (nullable),
  `reviewer: { id, name }`, `created_at`.
- `refundStatsSchema` — `by_status` com as quatro chaves, cada uma
  `{ count, amount_in_cents }`.

### 2. Corrigir o card "Total"

Hoje `PageHome.tsx:139` mostra `data.sum_amount_in_cents`, que a API calcula
sobre o conjunto filtrado — e a Home não filtra por status. O card passa a
mostrar a soma de `approved` + `paid`, com o rótulo dizendo o que é.

**A API não entrega esse número diretamente.** O `sum_amount_in_cents` respeita
o filtro, então obtê-lo exigiria duas requisições a mais (`?status=approved` e
`?status=paid`, cada uma com `per_page=1`). O endpoint de estatísticas entrega
tudo numa requisição, **mas é por usuário** — não serve para a visão de admin.

Decisão: para o usuário comum, os números vêm de
`GET /users/{meu_id}/refund-stats` — uma requisição, quatro status, e nenhuma
soma que misture. Para o admin na Home (que vê todos), o card mostra o total
solicitado com rótulo honesto ("Solicitado"), porque nenhum endpoint hoje
produz um agregado por status cruzando usuários. **Essa lacuna fica registrada
como pendência de backend**, não é contornada com N requisições.

### 3. Terceiro card

"Pendentes", com a contagem vinda da mesma fonte do item 2.

### 4. Rota de revisão

`/refunds/:id/review`, lazy, com `reviewLoader` que:

1. chama `requireSession()` como os demais;
2. lê a sessão para descobrir papel e id;
3. `ensureQueryData(refundDetailQuery(id))`;
4. redireciona para `/refunds/:id` se o papel não for `admin` **ou** se
   `refund.user.id` for o próprio.

A guarda vive no loader, não no componente, para a decisão acontecer antes de
qualquer render.

**Isto é usabilidade, não segurança.** Quem garante é o `403`/`404` do backend;
a UI apenas evita oferecer o que seria negado. Vale escrever isso no código —
é a primeira decisão de autorização do frontend, e confundir as duas coisas é
como nasce um cliente que "protege" rotas e vaza dados.

### 5. Destino do clique na Home

`role === "admin" && refund.user.id !== me` → `/refunds/:id/review`; senão
`/refunds/:id`.

### 6. Aprovar e rejeitar

Botões condicionados ao status atual — o do status vigente não é renderizado.
Rejeitar abre `Dialog` com textarea obrigatória validada por Zod. Sucesso
invalida `refundKeys.all` e volta para a Home.

Estados possíveis:

| Status atual | Botões |
|---|---|
| `pending` | Aprovar · Rejeitar |
| `approved` | Rejeitar · **Marcar como pago** |
| `rejected` | Aprovar |
| `paid` | nenhum (terminal) |

### 7. Marcar como pago

`POST /refunds/{id}/payment`, `multipart/form-data`, comprovante obrigatório.
Reusa `input-file.tsx` e as regras de validação do `refundCreateSchema`
(`.jpg/.jpeg/.png/.pdf`, 4MB) — as mesmas que o backend aplica.

### 8. Histórico

`GET /refunds/{id}/reviews` renderizado como linha do tempo no card de detalhe
**e** na tela de revisão. É o que finalmente torna o motivo da rejeição legível
para quem solicitou — a razão de o ciclo de backend ter existido.

Solicitação nunca decidida devolve lista vazia; a UI não mostra a seção.

### 9. Comprovante de pagamento

`GET /refunds/{id}/payment-receipt` exibido pelo `ReceiptPreview` que já existe,
que já cuida do Blob, do `objectURL` e do PDF vs imagem. Aparece só quando
`status === "paid"`.

### 10. Painel do solicitante

Na tela de revisão: nome do solicitante, contadores por status
(`GET /users/{id}/refund-stats`) e a lista das solicitações dele
(`GET /refunds?user_id={id}`), com as linhas clicáveis seguindo a mesma regra de
destino do item 5.

Avatar fica **de fora**: o upload não existe ainda, então todo mundo tem
`has_avatar: false` e o painel mostraria só iniciais. Entra no ciclo da foto de
perfil, que já está no backlog.

## Arquitetura

Tudo novo de reembolso entra em `src/features/refunds/`, atrás da fachada
`index.ts` — o `eslint-plugin-boundaries` (Item 9) recusa qualquer import ao
interior. A tela de revisão é uma **página** (`src/pages/PageRefundReview.tsx`),
casca fina que consome a feature, como as demais.

Hooks novos: `useRefundReviews`, `useRefundStats`, `useReviewRefund`,
`usePayRefund`. Os dois últimos são mutations que invalidam `refundKeys.all`.

## Testes

Vitest + Testing Library + MSW, no padrão da suíte atual (103 testes verdes no
ponto de partida).

- **Schemas:** um payload com `status: "paid"` passa; um com status desconhecido
  falha. É o teste que teria pego a quebra que originou este ciclo.
- **Loader da revisão:** `standard` é redirecionado; admin na própria é
  redirecionado; admin em alheia passa.
- **Destino na Home:** o `href` da linha muda conforme papel e dono.
- **Botões por status:** os quatro casos da tabela do item 6.
- **Rejeição:** confirmar sem motivo não dispara a mutation.
- **Pagamento:** arquivo inválido é recusado antes do envio.
- **Handlers MSW** para as três rotas novas.

Cada teste que protege uma decisão de autorização deve ser **visto falhar** —
padrão que o ciclo de backend adotou e que encontrou dois defeitos reais.

## Verificação

`npm run test`, `npx tsc -b --noEmit`, `npm run lint` (0 erros, 0 warnings no
ponto de partida) e `npm run build`. O aviso de chunk > 500 kB é **pré-existente**
— medir o antes para não atribuir a este ciclo.

Validação em navegador contra a API real fica para o Gabriel, com checklist
derivado do escopo.

## Consequências e pendências

- **Deploy conjunto continua obrigatório**, agora por dois motivos: o `user`
  aninhado (do ciclo anterior) e o `paid` (deste). Um frontend velho com backend
  novo quebra na primeira solicitação paga.
- **Lacuna de backend registrada:** não existe agregado por status cruzando
  usuários, então a Home do admin não consegue mostrar "aprovado + pago" de
  todos. Candidata a um `GET /refunds/stats` global.
- O avatar segue sem consumidor até o ciclo da foto de perfil.

## Fora de escopo

- Upload e exibição de foto de perfil.
- TanStack Table na listagem (Item 13) — a toolbar de filtro/ordenação
  server-side é ciclo próprio, e agora tem `status=paid` disponível.
- Error boundaries (Item 11).
- Paginação da lista do painel do solicitante: mostra a primeira página e um
  link para a Home filtrada.
