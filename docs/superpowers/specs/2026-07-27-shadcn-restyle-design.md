# Ciclo de feature — Restyle com shadcn/ui

Data: 2026-07-27.
Repositórios afetados: `Refund-FrontEnd` (implementação) e `Refund-api`
(soma na listagem + documentação canônica).

Este ciclo segue o
[fluxo permanente da trilha](../../../../Refund-api/docs/plans/learning-path-workflow.md).

## Motivação

Duas mudanças de direção do Gabriel, decididas no brainstorming de 2026-07-27:

1. A estilização atual não agrada, e o shadcn/ui resolve isso com um design
   system coeso, modular e já compatível com a stack do projeto.
2. A documentação prevê `@mui/x-data-grid` para a lista de reembolsos; o
   destino passa a ser **TanStack Table**, que é o que o Item 13 do
   `learning_path.md` e o `arquitetura_ideal_adaptada.md` sempre disseram.

## Item da trilha

**Item 10 — Pattern layer, segunda passagem.**

O ciclo do shell tratou essa camada **integrando uma lib pronta**
(`react-pro-sidebar`, tematizada por variáveis CSS). Este trata a mesma camada
pela via oposta: **posse do código**.

shadcn/ui não é uma dependência, é um *registry*: o CLI copia o `.tsx` para
dentro do repositório e sai de cena.

| | Dependência (`react-pro-sidebar`) | Copy-in (shadcn) |
|---|---|---|
| Quem versiona o componente | o autor da lib | você |
| Como customizar | props e CSS que ela expôs | edita o arquivo |
| Upgrade | `npm update`, pode quebrar | não existe; você já é o dono |
| Custo | superfície pequena, teto de customização baixo | mais código seu para manter |

O ponto honesto a registrar no diário: copy-in significa que **bugs do
componente viram bugs seus**, e que o volume de código do repositório cresce.

## Estado atual

- Design system em Atomic Design: `src/components/{atoms,molecules}`, com
  `Text`, `Icon`, `Skeleton`, `Button`, `ButtonIcon`, `Dialog`, `InputText`,
  `InputFile`, `InputLabelWrapper`, `PopOverMenu`.
- Paleta própria em `src/index.css`: `--surface`, `--app`, `--subtle`,
  `--line`, `--content`, `--muted`, `--accent`, `--accent-strong`,
  `--on-accent`, `--accent-soft`, `--overlay`, `--error`. O bloco `@theme` faz
  `--color-*: initial`, o que **apaga as cores padrão do Tailwind**.
- Shell com `react-pro-sidebar`; ícones do shell via `@mui/icons-material`;
  13 SVGs locais via `vite-plugin-svgr`.
- `PageHome` é um card `max-w-2xl` centralizado com `min-h-screen` próprio —
  escrito antes do shell existir, hoje emoldurado por sidebar e topbar.
- 59 testes verdes; `npm run lint` com 18 erros preexistentes.

## Custo de não mudar

- Colar qualquer componente do registry hoje produz um elemento **sem estilo**:
  `bg-background` e `border-input` não resolvem para nada, porque o vocabulário
  de tokens é outro e as cores padrão do Tailwind foram apagadas.
- Cada tela nova continua sendo construída à mão sobre `atoms`/`molecules`.
- A Home seria mexida duas vezes: agora no restyle e de novo no ciclo do
  TanStack Table.

## Decisões travadas no brainstorming

| Decisão | Escolha | Porquê |
|---|---|---|
| Alcance | **Restyle completo** | Design system, todas as telas e o shell de uma vez. |
| Direção visual | **Neutro puro shadcn** (`baseColor: neutral`) | É o visual que motivou a mudança; todo bloco do registry sai certo sem ajuste. O verde deixa de ser a cor da marca. |
| Estrutura de pastas | **`components/ui` substitui `atoms`/`molecules`** | Layout que o CLI e o registry assumem; colar componente novo nunca exige reescrever import. |
| Ícones | **Só `lucide-react`** | Padrão do shadcn; um traço visual único, importante porque ícone de categoria e de UI aparecem na mesma linha da lista. |
| Vocabulário de tokens | **O do shadcn é a fonte única** | Alias sobre os nomes atuais só compensaria se as telas antigas ficassem — elas não ficam. |
| Seletor de dark mode | **Continua `data-theme`**, não `.dark` | Um `@custom-variant` resolve e preserva `ThemeEffect` + store Zustand (Item 12) intactos. |
| Variantes | **`cva` + `clsx`**, saem `tailwind-variants` + `classnames` | O CLI gera `cva` em todo componente; manter `tailwind-variants` exigiria reescrever cada arquivo gerado, para sempre. |
| Layout da Home | **Painel + faixa de resumo** | É a estrutura que o ciclo do TanStack Table vai exigir; a Home é mexida uma vez só. |
| Números da faixa | **Soma vem do backend** | Somar `attributes` daria um total errado sempre que houver mais de uma página. |
| Item da trilha | **Item 10, segunda passagem** | Ver acima. |

## Fundação

1. `npx shadcn@latest init` → `components.json` com `baseColor: neutral`,
   `cssVariables: true`, `iconLibrary: lucide`, aliases apontando para o `@/`
   que já existe desde o Item 9.
2. `src/index.css`: sai a paleta atual, entram os tokens do shadcn
   (`--background`, `--foreground`, `--card`, `--popover`, `--primary`,
   `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`,
   `--input`, `--ring`, `--radius`, `--chart-*`, `--sidebar-*`). O
   `--color-*: initial` é removido e as cores padrão do Tailwind voltam.
3. Dark mode: `@custom-variant dark (&:is([data-theme="dark"] *));`.
   `ThemeEffect` grava `document.documentElement.dataset.theme` e **não muda**.
4. `cn()` em `src/lib/utils.ts`.

## Estrutura e boundaries

`src/components/ui/` nasce; `atoms/` e `molecules/` deixam de existir.

No `eslint.config.js`, a camada `ui` passa de
`['src/components/atoms', 'src/components/molecules']` para
`['src/components/ui']`. As políticas de dependência **não mudam**.

Dois ajustes que a camada exige:

- shadcn instala `src/hooks/use-mobile.ts`, que cai em `shared` — já permitido.
- **A dívida de lint muda de lugar, não desaparece.** Os 18 erros são
  `react-refresh/only-export-components` e estão inteiramente em
  `atoms/`+`molecules/`. Mas `button.tsx` do shadcn exporta `Button` **e**
  `buttonVariants`, disparando a mesma regra. A regra é desligada apenas para
  `src/components/ui/**` — código vendorizado do registry, que não é editado no
  dia a dia. Meta do ciclo: `npm run lint` com **0 erros**, a primeira vez na
  trilha.

## Dependências

**Entram:** `lucide-react`, `class-variance-authority`, `clsx`.

**Saem:** `@mui/icons-material`, `@mui/material`, `@emotion/react`,
`@emotion/styled`, `react-pro-sidebar`, `tailwind-variants`, `classnames`.

`@mui/material` e `@emotion/*` só existiam como peerDependency de
`@mui/icons-material`; nenhum arquivo os importa diretamente. Saldo: −7 pacotes.

`vite-plugin-svgr` **fica**: `Receipt.svg` continua como marca no Login,
Register e detalhe.

## Mapa de substituição

| Hoje | Vira |
|---|---|
| `molecules/Button` + `ButtonIcon` | `ui/button` (`size="icon"`) |
| `molecules/InputText` + `InputLabelWrapper` | `ui/input` + `ui/label` + `ui/form` |
| `molecules/Dialog` | `ui/dialog` |
| `molecules/PopOverMenu` | `ui/select` |
| `molecules/InputFile` | `ui/input` type=file + wrapper próprio |
| `atoms/Skeleton` | `ui/skeleton` |
| `atoms/Text` | classes Tailwind diretas |
| `atoms/Icon` + 12 SVGs de UI | `lucide-react` |
| `react-pro-sidebar` | `ui/sidebar` + `ui/sheet` |

Componentes adicionais do registry: `card`, `badge`, `dropdown-menu`,
`separator`, `tooltip`.

### Ícones

| SVG local | lucide |
|---|---|
| `ForkKnife` | `UtensilsCrossed` |
| `Bed` | `Bed` |
| `PoliceCar` | `Car` |
| `DesktopTower` | `Monitor` |
| `Wrench` | `Wrench` |
| `CaretDown` / `CaretLeft` / `CaretRight` | `ChevronDown` / `ChevronLeft` / `ChevronRight` |
| `Check` | `Check` |
| `Spinner` | `LoaderCircle` |
| `CloudArrowUp` | `CloudUpload` |
| `MagnifyingGlass` | `Search` |

Ícones do shell (`Menu`, `LightMode`, `DarkMode`, `ReceiptLong`, `Dashboard`,
`Group`, `CalendarMonth`, `Logout`, `ChevronLeft`, `ChevronRight`) passam a
`Menu`, `Sun`, `Moon`, `ReceiptText`, `LayoutDashboard`, `Users`,
`CalendarDays`, `LogOut`, `ChevronLeft`, `ChevronRight`.

`Receipt.svg` permanece como SVG local (marca, não ícone de sistema).

### Sidebar

O `SidebarProvider` do shadcn persiste estado por cookie. Ele será usado
**controlado** (`open` / `onOpenChange`) ligado a `src/stores/ui.ts`, com o
cookie desativado. A fonte única do estado de UI continua sendo o store
Zustand — Item 12 preservado.

### Formulários

`ui/form` é nativo de react-hook-form + `zodResolver`, que o projeto já usa, e
emite `aria-invalid` e `aria-describedby` por conta própria — exatamente o
trabalho manual do Item 7 em `InputText`/`InputLabelWrapper`. As auditorias
`vitest-axe` existentes são reexecutadas contra ele.

## Telas

As 7 rotas: `PageLogin`, `PageRegister`, `PageHome`, `PageRefundDetails`,
`PageSuccess`, `PageRouteError`, `PageComponents`.

`PageHome` passa ao layout de painel:

- cabeçalho de página com "Nova solicitação" à direita;
- faixa de resumo com 2 cards — **Solicitações** (`total`) e **Total**
  (`sum_amount_in_cents`);
- toolbar com a busca existente (search params e debounce preservados);
- lista em painel, mantendo `Link` por linha;
- paginação com "Página X de Y".

Sai o `max-w-2xl` + `min-h-screen` que hoje briga com o shell.

`PageComponents` é reconstruída como galeria dos componentes shadcn.

## Backend (`Refund-api`)

`select_refunds` já monta `filters` e roda um `count` na mesma sessão. A soma
entra na **mesma query**, evitando um segundo round trip:

```python
totals_query = (
    select(func.count(), func.sum(Refunds.c.amount_in_cents))
    .select_from(Refunds)
    .where(*filters)
)
total, total_amount = (await session.execute(totals_query)).one()
total_amount = total_amount or 0  # SUM over an empty set returns NULL
```

Propagação: `select_refunds` devolve `tuple[list[dict], int, int]` →
`RefundsRepositoryInterface` → `RefundListerController.__format_response`
acrescenta `sum_amount_in_cents` ao response.

A soma respeita os mesmos filtros da listagem, inclusive a regra de
autorização já existente (admin vê todos; usuário comum, apenas os seus).

Testes de repository e de controller acompanham a mudança. `UC-004` é
atualizado com o novo campo. No frontend,
`refundsListResponseSchema` ganha `sum_amount_in_cents`.

## Verificação

| Repositório | Comandos | Critério |
|---|---|---|
| `Refund-FrontEnd` | `npx tsc -b --noEmit`, `npm run test`, `npm run build`, `npm run lint` | typecheck e build limpos; testes verdes; **lint com 0 erros** |
| `Refund-api` | `pytest`, `pylint src` | verdes |

Os 59 testes atuais verificam comportamento acessível (role, nome acessível,
teclado), não classes CSS, então a maioria sobrevive à troca de componente. Os
que quebrarem quebram por seletor e serão adaptados **sem afrouxar a
asserção**.

Validação manual em navegador fica registrada como pendência se não houver
navegador conectado à sessão, seguindo o padrão dos itens anteriores.

## Documentação e commits

**`Refund-FrontEnd`** — implementação, este spec, e `AGENTS.md`: sai "Preserve a
organização em Atomic Design ao criar ou mover componentes" e sai
`tailwind-variants` da lista de stack.

**`Refund-api`** — dois assuntos, em commits separados por responsabilidade:

1. soma na listagem + `docs/use-cases/UC-004-list-refunds.md`;
2. documentação da trilha: `learning-path-progress.md` (Item 10, segunda
   passagem), `plans/current-state.md`, e a substituição de `@mui/x-data-grid`
   por **TanStack Table** no roadmap do
   `2026-07-26-frontend-shell-sidebar-theme-design.md`.

## Fora deste ciclo

- **TanStack Table na Home** — ciclo próprio (Item 13).
- **`status` e workflow de aprovação** — ciclo 2, backend primeiro.
- **Terceiro card da faixa de resumo** (Pendente/Aprovado) — depende de `status`.
- **Migrar o Auth Context** para Zustand — continua fora de escopo.
- **Foto e username reais** no backend.

## Roadmap atualizado dos ciclos

1. ~~Shell — sidebar + tema.~~ concluído
2. **(este) Restyle com shadcn/ui.**
3. Workflow de aprovação (backend primeiro: status + aprovar/rejeitar +
   autorização; depois frontend). Puxa Alembic (Item 18) e Unit of Work
   (Item 20).
4. Lista de reembolsos com **TanStack Table** (Item 13).
5. Dashboard + calendário.
6. Página de time/organização.
7. Fórum e mensagens.
