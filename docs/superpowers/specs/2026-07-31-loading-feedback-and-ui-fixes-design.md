# Ciclo de feature — Feedback de carregamento e ajustes de UI (frontend)

Data: 2026-07-31.
Repositório afetado: `Refund-FrontEnd`. **Nenhuma mudança de backend.**
Sucede o ciclo
[`2026-07-31-review-navigation-and-refund-table`](2026-07-31-review-navigation-and-refund-table-design.md),
mesclado na `main` e **validado em navegador pelo Gabriel**.

Este ciclo segue o
[fluxo permanente da trilha](../../../Refund-api/docs/plans/learning-path-workflow.md).

## Motivação

A validação em navegador do ciclo anterior levantou seis pontos. Quatro são
ajustes localizados; dois são o mesmo defeito com aparências diferentes.

**O estado de carregamento termina antes do trabalho.** Ao aprovar ou rejeitar
uma solicitação, a única resposta visual é o botão desabilitado — e ele volta ao
normal assim que o `PATCH` responde, **antes** de a tela refletir a decisão. O
histórico ainda não foi regerado, o status ainda é o antigo, mas a interface já
diz que terminou. A causa está em `useReviewRefund`:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: refundKeys.all, refetchType: "all" });
}
```

A promise de `invalidateQueries` é descartada. No React Query v5, um callback de
mutation que **devolve** uma promise mantém a mutation em `isPending` até ela
resolver; descartá-la faz o `isPending` acabar no fim da requisição HTTP, não no
fim da atualização. As cinco mutations do projeto têm o mesmo formato.

**O login tem o mesmo sintoma por outra causa.** Ali não há query a esperar: o
`onSubmit` resolve, o `isSubmitting` do react-hook-form cai, e só então
`navigate("/")` inicia uma navegação cujo loader ainda vai buscar dados. O botão
fica pronto com a página parada. Exclusão e criação compartilham esse formato.

Somam-se: o admin não tem, na Home, o número de solicitações pendentes; os
botões do sidebar deixam uma faixa sem hover à esquerda; o histórico lista a
decisão mais antiga primeiro; e a tela de sucesso oferece um botão "Nova
solicitação" que leva à Home em vez de reabrir o formulário.

## Decisões tomadas no brainstorming

| Decisão | Escolha | Razão |
|---|---|---|
| Forma do feedback | Spinner no botão acionado, demais desabilitados | Localizado; é o padrão que o diálogo de rejeição já tenta usar |
| Alcance | **As cinco** mutations | Mesma causa raiz; corrigir junto evita duas UIs para a mesma classe de ação |
| Origem do card de pendentes | `GET /refunds?status=pending&per_page=1` | Uma requisição, sem linha nenhuma no corpo; mantém o ciclo só de frontend |
| Escopo do número | **Global**, nunca filtrado nem paginado | Responde "o que exige ação minha", que não depende do que se está filtrando |
| Rótulos dos cards | Passam a declarar o escopo | Três números lado a lado com regras diferentes confundem sem isso |
| Reabertura do diálogo | `useOutletContext` | Mecanismo nativo para descer um gatilho ao `Outlet`; sem estado global nem URL |
| Correção do sidebar | Padding no lugar de `translate` | `translate` move a pintura e deixa a caixa de layout para trás |

**Alternativas descartadas, registradas:** um `GET /refunds/stats` global no
backend resolveria também o card de dinheiro do admin, mas viraria ciclo de dois
repositórios e reabriria o acoplamento de deploy. Um search param `?new=1` para
o diálogo seria coerente com a política de estado na URL, mas um refresh
reabriria o formulário. A store Zustand é persistida em `localStorage` — guardar
"diálogo aberto" ali exigiria um `partialize` para resolver algo que não precisa
ser global.

## Escopo, em ordem de risco

### 1. Feedback das mutations

Cinco ações, **quatro hooks** — aprovar e rejeitar compartilham
`useReviewRefund`. Verificado: os quatro têm o formato idêntico, e o alvo da
invalidação difere entre eles por razões já registradas no código:

| Hook | Ações | Invalida |
|---|---|---|
| `useReviewRefund` | aprovar, rejeitar | `refundKeys.all` |
| `usePayRefund` | marcar como pago | `refundKeys.all` |
| `useDeleteRefund` | excluir | `refundKeys.lists()` |
| `useCreateRefund` | criar | `refundKeys.lists()` |

**Esses alvos não mudam neste ciclo.** Os dois que miram só as listas fazem isso
de propósito — não faz sentido rebuscar o detalhe de um item que acabou de ser
apagado, nem o de um que ainda não foi aberto. A correção é só devolver a
promise; ampliar o alvo seria uma mudança de comportamento disfarçada de
correção de spinner.

Com isso o `isPending` dura até os refetches terminarem — incluindo o do
histórico, que é o requisito explícito do Gabriel.

Cada botão acionado ganha spinner e rótulo próprio ("Aprovando…", "Rejeitando…",
"Marcando como pago…", "Excluindo…", "Enviando…"), com os demais desabilitados.
`ReviewDecision` já alterna o rótulo do botão de confirmar rejeição; o que muda é
que o alternar passa a ser verdadeiro.

**Consequência registrada:** `refetchType: "all"` alcança também queries inativas
em cache, e passar a esperá-las pode segurar o spinner além do que a tela
precisa. É o preço de a Home estar fresca ao voltar. Se a validação em navegador
mostrar lentidão perceptível, o refinamento é esperar só as ativas e disparar as
inativas sem aguardar — não implementado agora para não otimizar contra um
problema que talvez não exista.

### 2. Feedback das navegações

`useNavigation()` do React Router (disponível porque o app usa Data Mode desde o
Item 3) expõe o estado da transição. Onde a ação termina em `navigate`, o botão
permanece ocupado enquanto `navigation.state !== "idle"`:

- `PageLogin` — o caso que o Gabriel descreveu
- `PageRefundDetails` — exclusão, que navega para a Home
- `RefundFormDialog` — criação, que navega para a tela de sucesso

Isso é **complementar** ao item 1, não redundante: um cobre esperar dados da
query, o outro cobre esperar a rota trocar.

### 3. Card de pendentes na Home

Só o **admin** ganha card novo. O usuário comum já tem o dele, vindo de
`GET /users/{id}/refund-stats`, que por ser por usuário já ignora filtro e
paginação.

Para o admin, uma query própria com parâmetros fixos:
`{ page: 1, perPage: 1, status: "pending" }`. Lê-se apenas `total`. A chave de
cache resultante é distinta da listagem da Home (perPage e status diferentes),
então não há colisão; e as invalidações das mutations já a alcançam, porque tudo
deriva de `refundKeys.all`.

**O número é global por construção** — não acompanha o filtro nem a página.

### 4. Rótulos que declaram o escopo

Com filtro ativo, "Solicitações" passa a nomear o filtro aplicado; "Pendentes"
ganha uma linha curta dizendo que ignora o filtro. Sem filtro, os rótulos voltam
ao que são hoje.

Isso fecha, de passagem, um achado da revisão do ciclo anterior: "Solicitações"
mostrava um número já estreitado pelo filtro sob um rótulo genérico.

### 5. Reset do formulário ao fechar

`RefundFormDialog` **já** chama `form.reset()` no caminho de sucesso, então
reabrir a partir da tela de sucesso já traz um formulário limpo. A lacuna é o
**cancelamento**: quem preenche, desiste e reabre encontra o que digitou.

Como "reabrir zerado" é requisito do item 6, o reset passa a acontecer ao fechar,
por qualquer caminho. O mesmo vale para o diálogo de rejeição em
`ReviewDecision`, que reseta no sucesso e não no cancelamento — é o achado
adiado do ciclo de revisão, e fica coerente fechá-lo junto, já que é a mesma
correção na mesma classe de componente.

### 6. Tela de sucesso com dois botões

`PageSuccess` passa a oferecer **"Nova solicitação"**, que reabre o diálogo
zerado sem sair da página, e **"Voltar para a Home"**.

`MainLayout` passa `context={{ openNewRefund }}` ao `<Outlet />`; `PageSuccess`
consome com `useOutletContext`. O estado do diálogo continua onde está — só o
gatilho desce. O comentário atual em `PageSuccess` diz que isso "fica pra quando
entrarmos na sub-fase de contexts"; essa fase passou, e o comentário sai junto.

### 7. Ordem do histórico

`ReviewTimeline` passa a exibir a decisão **mais recente primeiro**.

Cuidado de redação, não de código: o comentário do componente diz "nunca
reordenado aqui", e `reviewQueries.ts` diz que o chamador deve renderizar na
ordem recebida. Inverter a apresentação não é reordenar por campo — mas os dois
comentários precisam passar a dizer isso, ou o próximo leitor conclui que alguém
desrespeitou a regra sem perceber.

### 8. Alinhamento dos botões do sidebar

Sai o `translate-x-2` de `Sidebar.tsx` (no `SidebarMenuButton` e no `div` que
envolve o item desabilitado). O `translate` desloca a pintura e deixa a caixa de
layout onde estava — por isso o fundo do hover não alcança a borda esquerda.

Entra padding, que move o conteúdo preservando a caixa inteira, mais um override
`group-data-[collapsible=icon]:` para o ícone continuar centralizado no modo
trilho — que é o que o `translate` existia para resolver.

`src/components/core/Sidebar.tsx` é composição do projeto, não arquivo do
registry: não corre o risco de regeneração que `src/components/ui/sidebar.tsx`
tem documentado.

## Arquitetura

Nada de novo atravessa camadas. Os hooks de mutation ficam na feature
`refunds`; `useNavigation` é do router e é consumido nas páginas (camada `app`);
`useOutletContext` liga `MainLayout` a `PageSuccess`, ambos `app`. O
`eslint-plugin-boundaries` continua sendo o juiz.

Nenhum componente novo do design system. Um spinner reutilizável, se necessário,
vem do `lucide-react` (`Loader2` com `animate-spin`), como o resto do projeto.

## Testes

Suíte atual: 215 testes em 42 arquivos.

- Cada mutation: o estado de pendência **persiste até a invalidação resolver**.
  Este é o teste que prova a correção, e ele precisa distinguir "a requisição
  terminou" de "os refetches terminaram" — um teste que apenas aguarde o
  `mutateAsync` passaria com o código antigo.
- Botões: rótulo e spinner corretos durante a ação; demais desabilitados.
- Login/exclusão/criação: o botão continua ocupado enquanto a navegação não
  conclui.
- Card de pendentes: presente para admin, ausente para usuário comum (que tem o
  seu); o número **não muda** quando o filtro de status muda — a asserção que
  prova que ele é global.
- Rótulos: nomeiam o filtro quando há um, voltam ao padrão quando não há.
- Reset: reabrir depois de cancelar traz o formulário vazio, nos dois diálogos.
- `PageSuccess`: os dois botões existem, com destinos distintos; o de nova
  solicitação abre o diálogo sem navegar.
- `ReviewTimeline`: a primeira entrada renderizada é a mais recente.

O sidebar não ganha teste automatizado: é alinhamento visual, e o jsdom não
calcula layout. Vai para o checklist de navegador.

## Verificação

Por task e no fim: `npx vitest run`, `npx tsc -b --noEmit`, `npm run lint`
(0 erros, 0 warnings) e `npm run build`. Ponto de partida medido **antes** de
abrir a branch.

Validação em navegador com checklist item a item, incluindo o alinhamento e o
hover do sidebar aberto e no modo trilho, e a percepção de duração do spinner
(ver a consequência registrada no item 1).

## Consequências e pendências

- **Esperar a invalidação inteira pode alongar o spinner.** Refinamento
  registrado, não implementado.
- **A requisição do card de pendentes é uma a mais por carga da Home do admin.**
  Barata (nenhuma linha no corpo), mas é uma requisição.
- **O card de dinheiro do admin continua rotulado pelo filtro**, e não como
  `approved + paid` do usuário comum, porque o agregado global por status segue
  sem endpoint. Inalterado por este ciclo.

## Fora de escopo

- **`GET /refunds/stats` global** — backlog do backend.
- **Foto de perfil** — próximo ciclo do backlog do frontend.
- **A terceira cópia de BR-016** em `reviewLoader`, e a decisão sobre exportar
  `canReviewRefund` pela fachada — pendência aberta do ciclo anterior.
- **Otimistic updates.** Mostrar a decisão antes de o servidor confirmar
  resolveria a percepção de lentidão por outro caminho, mas troca honestidade
  por velocidade e exige tratar a reversão em erro. Não neste ciclo.
