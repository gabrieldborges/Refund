# Ciclo de feature — Navegação da revisão e tabela de solicitações (frontend)

Data: 2026-07-31.
Repositório afetado: `Refund-FrontEnd`. **Nenhuma mudança de backend.**
Sucede o ciclo
[`2026-07-30-refund-review-ui`](2026-07-30-refund-review-ui-design.md), já
mesclado na `main`.

Este ciclo segue o
[fluxo permanente da trilha](../../../Refund-api/docs/plans/learning-path-workflow.md).

## Motivação

O ciclo anterior entregou a tela de revisão, e o uso dela expôs três lacunas de
ergonomia e uma omissão:

**A tela de revisão não mostra o comprovante da despesa.** Ela renderiza só o
comprovante de *pagamento*, e só quando o reembolso já está pago
(`PageRefundReview.tsx:70`). Ou seja: o admin decide se aprova ou rejeita **sem
ver o documento que justifica o pedido** — que é o dado central da decisão. A
página de detalhe (`PageRefundDetails.tsx:92`) já mostra os dois. É uma omissão
da tela de revisão, não uma decisão.

**Navegar entre solicitações custa voltar para a Home.** O admin revisa uma,
volta, procura a próxima, abre. O painel do solicitante já lista as
solicitações daquela pessoa, mas não indica qual delas é a que está aberta nem
oferece um jeito de andar entre elas.

**A listagem da Home não diz de quem é a solicitação nem quando foi feita.** Para
um admin, que vê os reembolsos de todo mundo, "Almoço com cliente / Alimentação"
sem o nome do solicitante é ambíguo por construção.

E o **Item 13 da trilha** (TanStack Table) continua aberto, com toda a
infraestrutura de servidor pronta desde o ciclo de consulta da listagem:
`status`, `sort` e `order` existem em `GET /refunds` e ninguém os usa.

## Decisões tomadas no brainstorming

| Decisão | Escolha | Razão |
|---|---|---|
| Qual listagem vira tabela | Só a Home | No painel do solicitante todas as linhas são da mesma pessoa; a coluna "solicitante" seria uma repetição |
| Escopo do ciclo | Um ciclo, Item 13 **completo** | Tabela sem ordenação/filtro server-side é a armadilha que o Item 13 existe para evitar |
| Navegação por fila | Um botão "Próxima pendente" | Funciona partindo de qualquer status; anterior/próxima não tem posição definida quando o reembolso atual não é pendente |
| Ordem da fila | `sort=created_at&order=asc` | Comportamento de fila: a mais antiga sai primeiro, em vez de envelhecer |
| Navegação no painel | Setas ←/→ na lista do solicitante | Casa com o destaque da linha atual |
| Limite do painel | Setas param no 10º item, desabilitadas | Preserva a decisão do ciclo anterior de não paginar o painel |
| Responsivo da tabela | Esconder colunas abaixo de `sm` | Um caminho de render só; o mobile degrada para a linha de hoje |
| Card "Total" do painel | Contagem, não valor | Somar dinheiro dos quatro status junta previsão, passivo, despesa liquidada e nada |

## Escopo, em ordem de risco

### 1. Parâmetros de listagem (fundação)

`refundListSearchParamsSchema` ganha `status`, `sort` e `order`, cada um com
`.catch()` no padrão — o mesmo mecanismo que já normaliza `page`. As listas
brancas do cliente **espelham as do servidor** (UC-004):

- `status` ∈ `pending | approved | paid | rejected`, ausente = todos
- `sort` ∈ `created_at | amount_in_cents | name | status`, padrão `created_at`
- `order` ∈ `asc | desc`, padrão `desc`

Fora dessas listas o valor cai no padrão, não vira `422`. Um `422` por um
parâmetro de URL digitado errado seria a Home inteira em `isError`.

`refundListQuery`/`useRefunds` passam os três à API. A chave de cache é
`[...refundKeys.lists(), params]`, então os parâmetros novos entram no hash
sozinhos; parâmetros ausentes somem do hash, como já acontece com `userId`.

O bloco de normalização do `homeLoader` (`router-loaders.ts:59-76`, hoje só
`page` e `name`) passa a cobrir os três, mantendo a regra de **omitir da URL o
que é o padrão**.

Esta seção é fundação de duas outras: a toolbar (§3) e o botão "Próxima
pendente" (§9) consomem os mesmos parâmetros.

### 2. Tabela na Home

Entram `@tanstack/react-table` (v8) e o `ui/table` do shadcn
(`npx shadcn@latest add table`).

**Por que uma biblioteca, com ressalva.** O TanStack Table é *headless*: não
desenha nada e não traz estilo; dá a definição de colunas, o modelo de
linhas/cabeçalhos e o encanamento de estado. Com `manualSorting` e
`manualFiltering` ligados, porém, ele faz **bem menos** do que faria num app
que ordena no cliente — sobram definição de colunas, renderização de cabeçalhos
e visibilidade de coluna. Registrado como escolha consciente, e não como
suposição: o que a justifica é o Item 13 da trilha (aprender a ferramenta é o
objetivo declarado), o fato de "adicionar uma coluna" virar mudança em um lugar
só, e a visibilidade de coluna resolver o caso do admin sem `&&` espalhado pelo
JSX. Se não pagar, a remoção é contida — o `ui/table` fica.

As seis colunas:

| Coluna | Fonte | Ordenável |
|---|---|---|
| Categoria (ícone) | `CATEGORIES[refund.category]` | não |
| Título | `name` | sim |
| Solicitante | `user.name` | não |
| Data | `created_at` | sim |
| Status | badge de `REFUND_STATUS` | sim |
| Valor | `amount_in_cents` | sim |

**Só quatro são ordenáveis, e é o servidor mandando.** `sort` aceita
`created_at`, `amount_in_cents`, `name` e `status` — nada além. Categoria e
solicitante ficam sem cabeçalho clicável; um cabeçalho que parecesse clicável
ou não faria nada, ou ordenaria as 10 linhas da página.

Dois detalhes das colunas novas:

- **`created_at` é `nullable`** (`refund.ts:60`). Fallback `—`, não uma quebra
  no formatador. Entra `formatDate` em `src/lib/format.ts`, ao lado de
  `formatCentsToBRL`.
- **Solicitante só faz sentido para o admin.** Some por visibilidade de coluna
  quando `role !== "admin"`.

O ícone de categoria precisa de nome acessível: hoje ele é `aria-hidden` porque
o rótulo textual está ao lado (`PageHome.tsx:237`); numa célula própria, sem
esse texto, o rótulo da categoria vai para um `sr-only` ou para o `title` da
célula.

### 3. Toolbar: filtro por status

Um `ui/select` com Todos / Pendente / Aprovado / Pago / Rejeitado, escrevendo
`?status=` na URL. Trocar o filtro **reseta `page` para 1** — a mesma regra que
a busca por nome já segue (`updateListLocation(..., 1, true)`).

A ordenação é acionada pelos cabeçalhos das quatro colunas ordenáveis e também
escreve na URL. **O estado de ordenação não vive dentro do TanStack Table**:
vive nos search params, como `page` e `name` desde o Item 3. Recarregar
preserva a visão e um link compartilhado leva à mesma tabela.

### 4. Rótulo do card de resumo acompanha o filtro

`total` e `sum_amount_in_cents` já respeitam o filtro no servidor (UC-004),
então os cards de resumo se atualizam sozinhos. Mas o card do admin tem rótulo
fixo "Solicitado": com `status=paid` ativo ele mostraria a soma dos pagos sob
esse nome. O rótulo passa a acompanhar o filtro ("Pago", "Aprovado"…) e volta a
"Solicitado" quando o filtro é "Todos".

Os cards do usuário comum não são afetados: eles leem
`GET /users/{id}/refund-stats`, não a listagem.

### 5. Comprovante da despesa na tela de revisão

`PageRefundReview.tsx` renderiza `<ReceiptPreview kind="expense" />` sempre,
antes do de pagamento — a mesma ordem de `PageRefundDetails.tsx:92-95`. Nenhum
componente novo, nenhuma query nova: `useReceipt` já recebe `kind`.

O componente **já foi escrito prevendo dois previews na mesma tela**: o
`RECEIPT_COPY` (`ReceiptPreview.tsx:31`) existe para dar nomes acessíveis
distintos aos dois botões de tela cheia. A tela de revisão só nunca exerceu
isso.

### 6. Card "Total" no painel do solicitante

Quinto contador, somando as quatro contagens no cliente. **Contagem, não
valor.** Somar dinheiro dos quatro status juntaria previsão, passivo, despesa
liquidada e nada — é o que o comentário em `refund.ts:115` registra e a razão de
o card da Home somar só `approved + paid`. Contar solicitações
independentemente do status, ao contrário, responde a uma pergunta legítima:
quantas vezes essa pessoa pediu.

Esse mesmo comentário **já prevê este contador**: "Quem precisar de uma manchete
soma as contagens no cliente". O ciclo anterior deixou a porta aberta de
propósito; este a usa, sem reabrir a decisão de não haver total monetário.

O grid vai de `sm:grid-cols-4` para `sm:grid-cols-5`, com Total na primeira
posição, mesma forma dos outros quatro e o número um degrau maior — ele é o
denominador deles.

### 7. Destaque da solicitação atual no painel

Fundo `bg-accent` na linha correspondente **e** `aria-current="page"`. Os dois,
não só a cor: cor sozinha não é sinal acessível, e o `aria-current` é o que um
leitor de tela anuncia. A linha continua sendo um link para ela mesma —
transformá-la em não-link criaria uma segunda marcação para a mesma linha.

### 8. Setas de navegação no painel

Índice derivado da lista já carregada:
`list.attributes.findIndex((r) => r.id === currentId)`. Sem estado novo.

**Caso explícito:** se a solicitação atual não estiver entre os 10 carregados
(ela é a 15ª daquele usuário), `findIndex` devolve `-1` e não há posição de onde
andar — **as duas setas ficam desabilitadas**. É a consequência coerente de o
painel não paginar.

Os destinos passam por `getRefundHref` mesmo sabendo que todos darão em
`/review` (o solicitante nunca é o admin, garantido pelo `reviewLoader`). Usar a
função evita a segunda cópia da regra que ela existe para impedir.

Rótulos acessíveis distintos dos das setas de página da Home: "Solicitação
anterior deste solicitante" / "Próxima solicitação deste solicitante".

### 9. Botão "Próxima pendente"

No topo da tela de revisão. Um hook novo na feature,
`useNextPendingRefund(currentId, viewer)`, encapsulando a escolha: busca
`status=pending&sort=created_at&order=asc` (página 1) e devolve a primeira cujo
`id` não é o atual e cujo `user.id` não é o do admin (BR-016 — sem isso o botão
levaria a uma rota que o `reviewLoader` redireciona na hora).

**Limitação registrada:** o hook só olha a primeira página. Se as 10 pendentes
mais antigas forem todas do próprio admin, o botão desabilita mesmo havendo
outras adiante. Varrer páginas até achar custa mais do que o caso raro vale.

Sem pendente elegível, o botão fica **desabilitado, não ausente**. Um botão que
desaparece deixa a pessoa sem saber se a fila acabou ou se a tela quebrou.

## Arquitetura

Tudo dentro da feature `src/features/refunds/`, atrás da fachada `index.ts`:

- `api/refundQueries.ts` — `status`/`sort`/`order` nos params
- `schemas/refund.ts` — `refundListSearchParamsSchema` estendido
- `hooks/useNextPendingRefund.ts` — novo
- `components/RefundsTable.tsx` — novo, a tabela e suas colunas
- `components/RequesterPanel.tsx` — Total, destaque, setas
- `constants/status.ts` — opções do filtro derivadas do mapa existente

Fora da feature:

- `src/components/ui/table.tsx` — do registry
- `src/lib/format.ts` — `formatDate`
- `src/router-loaders.ts` — normalização dos parâmetros novos
- `src/pages/PageHome.tsx` — passa a montar a tabela
- `src/pages/PageRefundReview.tsx` — comprovante da despesa, botão da fila

A fachada ganha `RefundsTable` e `useNextPendingRefund`. Nada de novo atravessa
camadas: a tabela é feature, o `ui/table` é design system, e o
`eslint-plugin-boundaries` continua sendo o juiz.

## Testes

Suíte atual: 157 testes em 38 arquivos. O que entra:

- `formatDate` — formato pt-BR e o caminho `null`
- `refundListSearchParamsSchema` — valores válidos, e inválidos caindo no padrão
- Normalização do `homeLoader` — parâmetro padrão sumindo da URL
- Tabela — as seis colunas presentes para admin; coluna solicitante **ausente**
  para usuário comum; cabeçalho não-ordenável sem botão
- Ordenação — clique no cabeçalho escrevendo `sort`/`order` na URL
- Toolbar — troca de status escrevendo na URL e resetando `page`
- `RequesterPanel` — Total somando os quatro; `aria-current` na linha atual;
  setas desabilitadas nas pontas **e** quando o atual não está na lista
- `useNextPendingRefund` — escolhe a mais antiga; pula a atual; pula as do
  próprio admin; devolve nada quando não há elegível
- `PageRefundReview` — os dois previews presentes num reembolso pago, com nomes
  acessíveis distintos

Os handlers do MSW passam a honrar `status`, `sort` e `order` — sem isso o teste
do `useNextPendingRefund` provaria só que o hook pega o primeiro item de uma
lista que ignora o filtro. Aproveitar para trocar o `per_page: 10` literal de
`src/test/msw/handlers.ts` pela constante `REFUNDS_PER_PAGE`, dívida já
registrada nas pendências.

## Verificação

Por task e no fim da branch: `npx vitest run`, `npx tsc -b --noEmit`,
`npm run lint` (0 erros, 0 warnings — o ponto de partida é medido **antes** de
abrir a branch) e `npm run build`.

O bundle vai crescer com o `@tanstack/react-table`; registrar o número.
O aviso de chunk > 500 kB é **pré-existente** (518,36 kB no fim do ciclo
anterior) e não deve ser atribuído a este ciclo.

Responsividade conforme o `AGENTS.md`: medir overflow real comparando
`scrollWidth` com `clientWidth` no iPhone 12 Pro (390 × 844), não olhar
screenshot.

Validação no navegador contra a API real, com checklist item a item — o ciclo
anterior foi validado sem essa granularidade e ficou registrado como lacuna. A
suíte roda inteira contra o MSW, ou seja, contra o payload que nós mesmos
escrevemos.

## Consequências e pendências

- **Dependência nova** (`@tanstack/react-table`) com a ressalva de §2.
- **"Próxima pendente" varre só a primeira página** da fila.
- **As setas do painel param no 10º item** e ficam inertes se o reembolso atual
  não estiver entre eles.
- **No mobile o admin não vê solicitante nem data** na tabela; precisa abrir.
- **Categoria e solicitante não são ordenáveis** porque a API não os aceita em
  `sort`. Se um dia aceitar, ligar é uma linha por coluna.

## Fora de escopo

- **Foto de perfil** — `has_avatar` segue sem consumidor; é o próximo ciclo do
  backlog.
- **Paginação no painel do solicitante** — decisão do ciclo anterior, mantida.
- **Agregado global por status** (`GET /refunds/stats`) — backlog do backend; é
  o que faria o card do admin somar `approved + paid` como o do usuário comum.
- **E2E** — segue adiado, como desde o Item 6.
