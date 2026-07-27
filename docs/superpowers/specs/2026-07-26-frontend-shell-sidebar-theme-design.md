# Design — Shell do frontend: sidebar, topbar e tema

**Data:** 2026-07-26
**Repositório:** `Refund-FrontEnd`
**Status:** aprovado no brainstorming; pendente de plano de implementação.

## Contexto e motivação

O Refund hoje é direto ao ponto: a área autenticada usa um `MainLayout` simples
(`Header` no topo + `Outlet`). O Gabriel quer escalar o produto para um formato de
**painel de administração**, e o primeiro passo é reestruturar a **moldura (shell)**
onde as páginas vivem — porque toda feature futura (dashboard, calendário, time,
workflow de aprovação) vai ser renderizada dentro dela.

Este é o **sub-projeto C** da decomposição acordada. Ele é quase todo frontend e
serve como **veículo de dois itens do Learning Path** (ver seção "Relação com a
trilha").

## Escopo

### Dentro deste ciclo

- Substituir o `MainLayout` por um shell de duas partes: **sidebar** (à esquerda)
  + **topbar de ações** (topo do conteúdo) + `Outlet`.
- Sidebar com **`react-pro-sidebar`**, colapsável para *icon rail*, e drawer no
  mobile.
- **Bloco de perfil** no topo da sidebar (avatar por iniciais + nome + username
  derivado do e-mail).
- **Navegação**: item "Solicitações" ativo + "Dashboard/Time/Calendário" como
  itens desabilitados marcados "em breve".
- **Tema claro/escuro** por **variáveis CSS** (migração dos tokens de cor em todo
  o app) + **toggle** na topbar.
- **Store Zustand persistido** para preferências de UI (tema + estado da sidebar).
- Ícones via **`@mui/icons-material`**.
- Testes (Vitest + Testing Library) e acessibilidade no padrão do Item 7.

### Fora deste ciclo (cada um no seu próprio ciclo depois)

- **Tabela de dados** (**TanStack Table**) para a lista de reembolsos — será o
  veículo do Item 13, em ciclo próprio.
- **Foto e username reais** no backend (avatar upload + coluna) — junto do backend
  do workflow.
- As páginas **Dashboard / Time / Calendário** em si (aqui só entram como itens
  "em breve").
- O **workflow de aprovação** (status pendente/aprovado/rejeitado).

## Decisões (travadas no brainstorming)

| Decisão | Escolha | Porquê |
|---|---|---|
| Estrutura do shell | Sidebar + **topbar de ações** (layout B) | Separa "onde estou" (nav) de "o que faço" (ações); padrão de painel admin. |
| Colapso da sidebar | **Icon rail** (ícones + tooltip) | Navegação sempre acessível; padrão admin. |
| Mobile | **Drawer** por cima com overlay (botão ☰) | Sem espaço para sidebar fixa em telas estreitas. |
| Dado do perfil | **Frontend-only, derivado** | Avatar por iniciais; username do local-part do e-mail. Foto/username reais ficam para um ciclo com backend. |
| Alcance do dark mode | **App inteiro** (migração de tokens) | Dark mode "de verdade" em todas as telas; evita retrabalho. |
| Persistência de UI | **Zustand persistido** | Veículo do Item 12; tema + sidebar em `localStorage`, default respeita o sistema. |
| Sidebar | **`react-pro-sidebar`** tematizada por `var(--…)` | Preferência do Gabriel; colapso/responsividade prontos; cores unificadas via variáveis CSS. |
| Ícones | **`@mui/icons-material`** | Preferência do Gabriel; MUI/Emotion já entram por aqui. |

## Arquitetura

### Estrutura de arquivos (respeitando os boundaries do Item 9)

```
src/
  components/core/
    MainLayout.tsx      # reescrito: compõe Sidebar + Topbar + Outlet + dialog
    Sidebar.tsx         # novo — react-pro-sidebar (camada app)
    Topbar.tsx          # novo — título + ações (camada app)
  stores/
    ui.ts               # novo — store Zustand (tema + sidebar). Camada shared.
  lib/
    profile.ts          # novo — deriva iniciais e username (util puro). Camada shared.
  index.css             # tokens de cor viram variáveis CSS (claro + escuro)
  router.tsx            # rotas ganham handle: { title } para a topbar
```

- **`Sidebar` e `Topbar` são camada `app`** → ficam em `components/core/`, que já é
  classificada como `app` no `eslint.config.js`. Podem importar `ui`, `shared` e a
  fachada de features — coerente com as fronteiras do Item 9.
- **A pasta `src/stores/` é nova.** Para o `eslint-plugin-boundaries` continuar
  significando algo, adicionar `src/stores` ao descritor da camada **`shared`** no
  `eslint.config.js` (uma linha). O store é estado neutro de preferências, sem
  domínio nem UI — classificação `shared` é adequada.
- O `organisms/Header.tsx` atual é **removido**; suas responsabilidades migram
  (logout → rodapé da sidebar; "Nova solicitação" e tema → topbar). Se o átomo
  `NavLink` ficar sem uso, remover também.

### Tema por variáveis CSS + Zustand

**Tokens como variáveis CSS.** Definir um conjunto de tokens **semânticos** (não
"green-100", mas papéis: superfície, fundo, borda, texto, texto-suave, acento,
etc.) como variáveis CSS. Os valores trocam sob `[data-theme="dark"]`:

```css
:root {
  --surface: #ffffff;  --bg: #f7f8fa;  --border: #e8eaed;
  --text: #1f2937;     --muted: #6b7280;  --accent: #1a7f5a;
}
:root[data-theme="dark"] {
  --surface: #161b20;  --bg: #0f1215;  --border: #242a30;
  --text: #e6e8ea;     --muted: #9aa4ad;  --accent: #2fae7c;
}
```

O tema do Tailwind 4 mapeia utilitários para essas variáveis (ex.: `--color-surface:
var(--surface)`), de modo que `bg-surface`, `text-muted`, etc. **acompanham a troca
de tema automaticamente** — sem precisar de variantes `dark:` espalhadas. Os
componentes passam a usar os tokens semânticos no lugar das cores fixas atuais
(`bg-white`, `text-green-100`, `border-gray-300`…). Essa migração alcança todo o
app (Home, diálogos, formulários, design system).

**Store Zustand (`src/stores/ui.ts`).** Estado persistido no `localStorage`:

```ts
type Theme = "light" | "dark" | "system";
interface UiState {
  theme: Theme;               // default "system"
  sidebarCollapsed: boolean;  // default false
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;    // alterna light/dark (resolvendo "system")
  toggleSidebar: () => void;
}
```

**Aplicação do tema.** Um efeito no topo do app (ex.: um `ThemeEffect` montado em
`App.tsx`) lê o store e escreve `document.documentElement.dataset.theme`. Quando o
tema é `"system"`, resolve via `matchMedia("(prefers-color-scheme: dark)")` e
escuta mudanças do sistema.

**`react-pro-sidebar` consome os mesmos tokens.** Estilizado via `rootStyles` /
`menuItemStyles` referenciando `var(--surface)`, `var(--accent)`, etc. Como são as
mesmas variáveis, a sidebar troca de tema junto com o resto, sem sincronização
manual.

### Sidebar

- **Perfil (topo):** avatar circular com **iniciais** do nome (ex.: "Gabriel
  Dantas" → "GD"), nome e **username derivado** do local-part do e-mail
  (ex.: `gabriel@x.com` → `@gabriel`). A derivação vive em `lib/profile.ts` (função
  pura, testável).
- **Navegação:** lista declarativa de itens `{ label, to, icon, disabled }`.
  "Solicitações" → `/` (ativo por rota); "Dashboard", "Time", "Calendário" →
  `disabled: true` com selo "em breve".
- **Colapso (desktop):** botão `«/»` alterna `sidebarCollapsed` no store;
  colapsado vira *icon rail* (prop `collapsed` do react-pro-sidebar) com tooltip
  nos itens. É uma **preferência persistida**.
- **Drawer (mobile):** conceito **diferente** do colapso — usa a prop `toggled`
  do react-pro-sidebar + `breakPoint`/`onBackdropClick`. O `toggled` é estado
  **efêmero e local** (não persiste; a gaveta fecha ao navegar ou tocar fora), não
  entra no store. O botão ☰ da topbar controla esse `toggled`.
- **Rodapé:** botão **Sair** → `useAuth().logout()` + `navigate("/login")`.

### Topbar

- **Título da página:** vem da rota via `handle: { title }` no `router.tsx`; a
  topbar lê com `useMatches()` e usa o título do match mais profundo que o
  define. Sem estado global para isso.
- **Ações (à direita):** toggle de tema (ícone sol/lua conforme o tema resolvido)
  e botão **"Nova solicitação"**.
- **"Nova solicitação":** o estado de abertura do `RefundFormDialog` continua no
  `MainLayout`; a topbar recebe um callback `onNewRefund`. (O dialog já existe e é
  reutilizado como está.)
- No mobile, a topbar também mostra o botão ☰ que abre o drawer.

### Responsividade e acessibilidade

- **Breakpoint do drawer:** `md` (viewport estreito → drawer). Alinha com a
  referência de auditoria do projeto (iPhone 12 Pro, 390px).
- **A11y:** toggles de tema e de colapso são `<button>` com `aria-label` claro
  ("Alternar tema", "Recolher menu"); item de nav ativo com `aria-current="page"`;
  ícones decorativos `aria-hidden`. Manter o padrão estabelecido no Item 7.

## Dependências novas

| Pacote | Uso | Observação |
|---|---|---|
| `react-pro-sidebar` (^1.x) | A sidebar | Traz Emotion como runtime; tematizada via `var(--…)`. |
| `@mui/icons-material` | Ícones Material | Peers: `@mui/material`, `@emotion/react`, `@emotion/styled`. |
| `@mui/material` | Peer dos ícones | Segundo sistema de estilo presente no app (aceito conscientemente). |
| `@emotion/react`, `@emotion/styled` | Peers do MUI | — |
| `zustand` (^5.x) | Store de UI | Veículo do Item 12. |

## Plano de testes (Vitest + Testing Library)

- **Store de UI:** `toggleTheme` alterna e persiste; `toggleSidebar` persiste;
  ler o estado inicial respeita o valor salvo.
- **Aplicação do tema:** com o store em `dark`, `document.documentElement` recebe
  `data-theme="dark"`; `"system"` resolve pela media query mockada.
- **`lib/profile.ts`:** iniciais e username derivados corretamente (incluindo nome
  com uma só palavra e e-mail sem ponto).
- **Sidebar:** item ativo reflete a rota; itens "em breve" estão desabilitados
  (não navegam); "Sair" chama `logout` e navega para `/login`.
- **Topbar:** "Nova solicitação" dispara `onNewRefund`; toggle de tema altera o
  store; título vem do `handle` da rota.

## Relação com a trilha de aprendizado

- **Item 12 (Zustand + persistência seletiva):** este ciclo é o veículo — store
  persistido de preferências de UI (tema + sidebar), exatamente o caso-exemplo que
  a trilha cita (preferência de tema). Não migrar Auth para Zustand.
- **Item 10 (Pattern layer):** **reinterpretado.** Em vez de construir um pattern
  do zero com nossos componentes, **integramos e tematizamos** o `react-pro-sidebar`.
  É um aprendizado válido e diferente; registrar essa mudança de objetivo no diário
  no encerramento.
- O encerramento (diário `learning-path-progress.md` + `current-state.md` no
  `Refund-api`, e commits) segue o `learning-path-workflow.md` como nos itens
  anteriores.

## Ciclos futuros (roadmap da decomposição)

Ordem recomendada, cada um com seu próprio spec → plano:

1. **(este) Shell — sidebar + tema.**
2. **Workflow de aprovação** (backend primeiro: status + aprovar/rejeitar +
   autorização; depois frontend). Puxa Alembic (Item 18) e Unit of Work (Item 20).
   Resolve de brinde "nome do emissor + data" na listagem.
3. **Lista de reembolsos com TanStack Table** (paginação/ordenação em modo
   servidor + toolbar de filtro). Veículo do Item 13.
4. **Dashboard + calendário** (dependem de status e emissor/data).
5. **Página de time/organização.**
6. **Fórum e mensagens** (domínios novos, bem mais à frente).

## Decisões deixadas com default explícito

- **Local do store:** `src/stores/ui.ts`, adicionado à camada `shared` no
  `eslint.config.js`. (Alternativa considerada: `src/lib/`; preferimos `stores/`
  pela clareza.)
- **Breakpoint do drawer:** `md`.
- **Título da topbar:** via `handle` de rota, não via store.
- **Estado do dialog "Nova solicitação":** permanece no `MainLayout`.
