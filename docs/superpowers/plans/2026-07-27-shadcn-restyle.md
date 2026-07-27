# Restyle com shadcn/ui — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o design system Atomic Design do `Refund-FrontEnd` por shadcn/ui em paleta neutra, reconstruir o shell e as 7 telas sobre ele, e adicionar ao `Refund-api` a soma que a nova faixa de resumo da Home precisa.

**Architecture:** shadcn/ui é um *registry*, não uma dependência: o CLI copia cada `.tsx` para `src/components/ui/` e sai de cena. Os tokens do shadcn passam a ser o vocabulário único de cor em `src/index.css`, com dark mode continuando no atributo `data-theme` já usado pelo store Zustand. A camada `ui` do `eslint-plugin-boundaries` passa a apontar para `src/components/ui`, preservando as políticas de dependência do Item 9.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS 4, shadcn/ui (registry), Radix UI, lucide-react, class-variance-authority, clsx, tailwind-merge, react-hook-form, Zod 4, TanStack Query 5, Zustand 5, Vitest 4, Testing Library, MSW 2, vitest-axe. Backend: Python, FastAPI, SQLAlchemy Core async, pytest.

**Spec:** [`docs/superpowers/specs/2026-07-27-shadcn-restyle-design.md`](../specs/2026-07-27-shadcn-restyle-design.md)

## Global Constraints

- Textos de UI em **português**; código, identificadores e comentários de teste em **inglês** (`AGENTS.md`).
- Cada teste fica **ao lado** do código testado, sufixo `.test.tsx` / `.test.ts` (frontend) e `_test.py` (backend).
- Todo teste e toda fixture levam um **comentário curto em inglês** explicando o cenário.
- Vitest roda **sem `globals`**: `describe`/`it`/`expect` são sempre importados explicitamente de `vitest`.
- Testes verificam **comportamento acessível** (role, nome acessível, teclado), nunca classes CSS.
- Imports internos usam o alias **`@/`** (Item 9). Nada de `../../../`.
- A fachada `@/features/refunds` é o único ponto de entrada da feature — nunca importar o interior.
- Backend: `HTTPException` direto em dependencies; nas views, o `try/except` com `error_handler`.
- Verificação por repositório: `Refund-FrontEnd` → `npx tsc -b --noEmit`, `npm run test`, `npm run build`, `npm run lint`. `Refund-api` → `pytest`, `pylint src`.
- Branch do frontend: `feat/shadcn-restyle` (já criada, contém o spec). Branch do backend: `feat/refund-list-sum`.
- Meta de lint ao fim do ciclo: **0 erros** (hoje são 18).

---

### Task 1: Fundação — tokens, `cn`, `components.json` e `ui/button`

Instala a base do shadcn e prova que ela funciona com o primeiro componente. Nada é deletado ainda: `atoms/` e `molecules/` continuam de pé para as telas ainda não migradas.

**Files:**
- Create: `components.json`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx` (gerado pelo CLI)
- Create: `src/components/ui/button.test.tsx`
- Modify: `src/index.css` (substituição integral)
- Modify: `eslint.config.js` (camada `ui`)
- Modify: `package.json` (dependências)

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` de `@/lib/utils`; `Button` e `buttonVariants` de `@/components/ui/button`. `Button` aceita `variant` (`default | destructive | outline | secondary | ghost | link`), `size` (`default | sm | lg | icon`) e `asChild`.
- Produces: vocabulário de tokens Tailwind — `bg-background`, `text-foreground`, `bg-card`, `bg-primary`, `text-primary-foreground`, `bg-muted`, `text-muted-foreground`, `border-border`, `bg-destructive`, `ring-ring`, `rounded-lg` (via `--radius`).

- [ ] **Step 1: Instalar as dependências novas**

```bash
npm install lucide-react class-variance-authority clsx
```

`tailwind-merge` e `tw-animate-css` já estão instalados e não precisam ser tocados.

- [ ] **Step 2: Criar `components.json` à mão**

Não rode `npx shadcn@latest init`: ele reescreve o `src/index.css` de forma não controlada. Escrevendo o `components.json` manualmente, o `shadcn add` passa a funcionar com a configuração exata que queremos.

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

`"config": ""` é o que sinaliza Tailwind v4 (sem `tailwind.config.js`).

- [ ] **Step 3: Criar `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Every shadcn component funnels its classes through this helper: clsx resolves
// conditionals, twMerge drops earlier Tailwind utilities that a later one
// overrides (so a caller's `px-8` really beats the component's `px-4`).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Substituir `src/index.css` por completo**

Sai a paleta atual (`--surface`, `--app`, `--accent`…) e o `--color-*: initial` que apagava as cores padrão do Tailwind. O `@custom-variant` é o ponto que preserva o Item 12: o dark mode continua no atributo `data-theme` que o `ThemeEffect` grava, em vez da classe `.dark` que o shadcn usa por padrão.

```css
@import 'tailwindcss';
@import "tw-animate-css";

/* shadcn ships dark mode as a `.dark` class. This project already drives the
   theme through <html data-theme="…"> (ThemeEffect + the Zustand store), so we
   point the variant at that attribute instead and leave Item 12 untouched. */
@custom-variant dark (&:is([data-theme="dark"] *));

:root {
  --radius: 0.625rem;

  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);

  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);

  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

:root[data-theme="dark"] {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.269 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.371 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);

  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);

  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: "Open Sans", sans-serif;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 5: Gerar o `ui/button`**

```bash
npx shadcn@latest add button
```

Confirme que o arquivo criado foi `src/components/ui/button.tsx` e que ele importa `cn` de `@/lib/utils`.

- [ ] **Step 6: Registrar `components/ui` na camada `ui` do ESLint**

Em `eslint.config.js`, dentro de `boundaries/elements`, a entrada da camada `ui` passa a listar as três pastas. `atoms` e `molecules` saem só na Task 9, quando forem deletadas.

```js
{ type: 'ui', pattern: ['src/components/ui', 'src/components/atoms', 'src/components/molecules'] },
```

- [ ] **Step 7: Escrever o teste do Button**

Arquivo `src/components/ui/button.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  // The button must expose its label as the accessible name, so tests and
  // screen readers can find it by role + name.
  it("renders with an accessible name", () => {
    render(<Button>Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument();
  });

  // Clicking must call the handler — the default type is "button", so this
  // must not depend on being inside a form.
  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Enviar</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  // A disabled button must not fire its handler.
  it("does not call onClick when disabled", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Enviar</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  // asChild lets the button render as another element (a router Link, for
  // example) while keeping the button styling.
  it("renders as the child element when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/refunds">Ver solicitações</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Ver solicitações" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Rodar o teste novo**

Run: `npx vitest run src/components/ui/button.test.tsx`
Expected: PASS, 4 testes.

- [ ] **Step 9: Rodar a suíte inteira e o typecheck**

Run: `npm run test && npx tsc -b --noEmit && npm run build`
Expected: os 59 testes existentes continuam verdes (+4 novos = 63), typecheck exit 0, build ok.

As telas antigas vão ficar **visualmente quebradas** a partir daqui — elas usam `bg-surface`, `text-content`, `text-accent`, que não existem mais. Isso é esperado e some conforme as tasks seguintes migram cada tela. Nenhum teste quebra por isso, porque os testes verificam comportamento, não classes.

- [ ] **Step 10: Commit**

```bash
git add components.json src/lib/utils.ts src/components/ui src/index.css eslint.config.js package.json package-lock.json
git commit -m "feat: add shadcn foundation with neutral tokens and ui/button"
```

---

### Task 2: `ui/form` + `ui/input` + `ui/label` e `PageLogin`

Primeira tela real sobre o shadcn. É aqui que o Item 7 (acessibilidade) migra do trabalho manual para o `ui/form`, que emite `aria-invalid` e `aria-describedby` sozinho.

**Files:**
- Create: `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/form.tsx`, `src/components/ui/card.tsx` (gerados pelo CLI)
- Modify: `src/pages/PageLogin.tsx`
- Modify: `src/pages/PageLogin.test.tsx`
- Modify: `src/pages/PageLogin.integration.test.tsx`

**Interfaces:**
- Consumes: `cn` de `@/lib/utils`; `Button` de `@/components/ui/button`.
- Produces: `Input` de `@/components/ui/input`; `Label` de `@/components/ui/label`; `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` de `@/components/ui/form`; `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` de `@/components/ui/card`.

- [ ] **Step 1: Gerar os componentes**

```bash
npx shadcn@latest add input label form card
```

`form` puxa `label` e `@radix-ui/react-slot` como dependências internas — se o CLI perguntar, aceite.

- [ ] **Step 2: Reescrever `src/pages/PageLogin.tsx`**

O `PageLogin` hoje usa `useState` por campo. Ele passa a usar react-hook-form + Zod, que é o padrão que o `ui/form` espera e que o `RefundFormDialog` já usava. O comportamento observável é o mesmo: e-mail, senha, erro da API e link para cadastro.

```tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ReceiptIcon from "@/assets/icons/Receipt.svg?react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/context/useAuth";
import { getApiErrorMessage } from "@/lib/api";

const loginFormSchema = z.object({
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormData = z.output<typeof loginFormSchema>;

export default function PageLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormData) {
    setSubmitError(null);
    try {
      await login(data.email, data.password);
      navigate("/");
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <ReceiptIcon className="h-8 w-8 text-foreground" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">refund</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="voce@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError && (
              <p role="alert" className="text-sm text-destructive">
                {submitError}
              </p>
            )}

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </Form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Não tem uma conta?{" "}
          <Link to="/register" className="font-semibold text-foreground underline-offset-4 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rodar os testes existentes do login para ver o que quebra**

Run: `npx vitest run src/pages/PageLogin.test.tsx src/pages/PageLogin.integration.test.tsx`
Expected: FAIL nos casos que buscam campo por `placeholder`, porque agora existe `<label>` associada e o nome acessível mudou.

- [ ] **Step 4: Adaptar os testes para buscar por label**

Troque `getByPlaceholderText("voce@exemplo.com")` por `getByLabelText("E-mail")` e o equivalente para senha. **Não afrouxe asserção nenhuma** — só o seletor muda. Acrescente ao `PageLogin.test.tsx` o caso que prova o ganho do `ui/form`:

```tsx
// The shadcn Form wires aria-invalid and aria-describedby on its own: an
// invalid field must announce itself and point at its message. This is the
// Item 7 accessibility work, now handled by the component instead of by hand.
it("marks an invalid field and links it to its message", async () => {
  renderPageLogin();

  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

  const email = await screen.findByLabelText("E-mail");
  expect(email).toHaveAttribute("aria-invalid", "true");
  expect(email).toHaveAccessibleDescription("E-mail é obrigatório");
});
```

- [ ] **Step 5: Rodar os testes do login**

Run: `npx vitest run src/pages/PageLogin.test.tsx src/pages/PageLogin.integration.test.tsx`
Expected: PASS.

- [ ] **Step 6: Suíte inteira + typecheck**

Run: `npm run test && npx tsc -b --noEmit`
Expected: verdes.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui src/pages/PageLogin.tsx src/pages/PageLogin.test.tsx src/pages/PageLogin.integration.test.tsx package.json package-lock.json
git commit -m "feat: rebuild the login screen on shadcn form primitives"
```

---

### Task 3: `PageRegister`

**Files:**
- Modify: `src/pages/PageRegister.tsx`
- Modify: `src/pages/PageRegister.a11y.test.tsx`

**Interfaces:**
- Consumes: `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, `Input`, `Button`.

- [ ] **Step 1: Reescrever `PageRegister` no mesmo formato da Task 2**

Mesma estrutura do `PageLogin`: contêiner `min-h-screen bg-background`, cartão `max-w-sm rounded-xl border bg-card p-8`, logo `ReceiptIcon`, campos via `FormField`, erro de submit num `<p role="alert" className="text-sm text-destructive">`, botão `Button type="submit"`, e o link no rodapé apontando para `/login` com o texto "Já tem uma conta? Entrar".

O schema do formulário fica no próprio arquivo, espelhando o do login e acrescentando o nome:

```tsx
const registerFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
});

type RegisterFormData = z.output<typeof registerFormSchema>;
```

Preserve a chamada de cadastro e a navegação pós-sucesso exatamente como estão hoje no arquivo.

- [ ] **Step 2: Rodar a auditoria de acessibilidade existente**

Run: `npx vitest run src/pages/PageRegister.a11y.test.tsx`
Expected: PASS — o `vitest-axe` não deve acusar violação. Se acusar `label`, é sinal de que algum campo ficou fora de um `FormField`/`FormLabel`.

- [ ] **Step 3: Ajustar seletores que usavam placeholder**

Mesma regra da Task 2: `getByLabelText` no lugar de `getByPlaceholderText`, sem afrouxar asserção.

- [ ] **Step 4: Suíte inteira + typecheck**

Run: `npm run test && npx tsc -b --noEmit`
Expected: verdes.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PageRegister.tsx src/pages/PageRegister.a11y.test.tsx
git commit -m "feat: rebuild the register screen on shadcn form primitives"
```

---

### Task 4: `ui/dialog` + `ui/select` e o `RefundFormDialog`

O `PopOverMenu` era um `Popover` do Radix com `role="button"` sintetizado à mão — inclusive com o `onKeyDown` que traduzia Enter/Espaço em clique, porque um `<div role="button">` não faz isso sozinho. O `ui/select` do shadcn é um `Select` de verdade, com navegação por seta nativa: isso **fecha a pendência de a11y do `PopOverMenu`** registrada no `current-state.md`.

**Files:**
- Create: `src/components/ui/dialog.tsx`, `src/components/ui/select.tsx` (gerados pelo CLI)
- Create: `src/components/ui/input-file.tsx`
- Create: `src/components/ui/input-file.test.tsx`
- Modify: `src/features/refunds/components/RefundFormDialog.tsx`
- Modify: `src/features/refunds/components/RefundFormDialog.test.tsx`
- Modify: `src/features/refunds/components/RefundFormDialog.a11y.test.tsx`

**Interfaces:**
- Produces: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` de `@/components/ui/dialog`; `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` de `@/components/ui/select`; `InputFile` (default export) de `@/components/ui/input-file`, com props `{ label?: string; placeholder?: string }` mais as de `<input type="file">`, encaminhando `ref`.

- [ ] **Step 1: Gerar os componentes**

```bash
npx shadcn@latest add dialog select
```

- [ ] **Step 2: Escrever o `ui/input-file`**

O shadcn não tem um componente de upload no registry base. Este é o único componente autoral da camada `ui` — mantém o comportamento do `InputFile` atual (mostrar o nome do arquivo escolhido) sobre um `<input type="file">` nativo.

```tsx
import { useId, useState, type ComponentProps } from "react";
import { CloudUpload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface InputFileProps extends Omit<ComponentProps<"input">, "type"> {
  label?: string;
  placeholder?: string;
}

// react-hook-form registers this through `register("file")`, which hands us a
// ref and an onChange. We keep the native input as the single source of truth
// and only mirror the chosen file name for display.
export default function InputFile({
  label = "Comprovante",
  placeholder = "Nome do arquivo.pdf",
  className,
  onChange,
  ...props
}: InputFileProps) {
  const inputId = useId();
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="flex w-full flex-col gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="file"
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
            "file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-sm file:font-medium",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
            className,
          )}
          onChange={(event) => {
            setFileName(event.target.files?.[0]?.name ?? null);
            onChange?.(event);
          }}
          {...props}
        />
        <CloudUpload className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <p className="text-xs text-muted-foreground">{fileName ?? placeholder}</p>
    </div>
  );
}
```

- [ ] **Step 3: Escrever o teste do `ui/input-file`**

Arquivo `src/components/ui/input-file.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InputFile from "./input-file";

describe("InputFile", () => {
  // The label must be associated with the input, so it can be found by name.
  it("associates its label with the input", () => {
    render(<InputFile label="Comprovante" />);
    expect(screen.getByLabelText("Comprovante")).toBeInTheDocument();
  });

  // Choosing a file must replace the placeholder with the file name. This is
  // the one behaviour the wrapper adds on top of the native input, and it also
  // covers the `file` field that the schema unit test could not exercise.
  it("shows the chosen file name", async () => {
    render(<InputFile label="Comprovante" placeholder="Nome do arquivo.pdf" />);

    const file = new File(["nota"], "nota-fiscal.pdf", { type: "application/pdf" });
    await userEvent.upload(screen.getByLabelText("Comprovante"), file);

    expect(screen.getByText("nota-fiscal.pdf")).toBeInTheDocument();
    expect(screen.queryByText("Nome do arquivo.pdf")).not.toBeInTheDocument();
  });
});
```

Isso fecha a pendência **"Campo `file` do `refundCreateSchema` sem teste"** do `current-state.md`: `userEvent.upload` constrói o `FileList` que o jsdom não montava à mão.

- [ ] **Step 4: Rodar o teste do input-file**

Run: `npx vitest run src/components/ui/input-file.test.tsx`
Expected: PASS, 2 testes.

- [ ] **Step 5: Reescrever o `RefundFormDialog`**

Trocas: `Dialog`/`DialogContent` do shadcn; `Select` no lugar do `PopOverMenu`; `FormField` envolvendo cada campo; `InputFile` novo; `Button` do shadcn.

```tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import InputFile from "@/components/ui/input-file";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CATEGORY_OPTIONS } from "../constants/categories";
import {
  refundCreateSchema,
  type RefundCreateFormData,
  type RefundCreateFormInput,
} from "../schemas/refund";
import { useCreateRefund } from "../hooks/useCreateRefund";
import { getApiErrorMessage } from "@/lib/api";

interface RefundFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RefundFormDialog({ open, onOpenChange }: RefundFormDialogProps) {
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useCreateRefund();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<RefundCreateFormInput, unknown, RefundCreateFormData>({
    resolver: zodResolver(refundCreateSchema),
  });

  async function onSubmit(data: RefundCreateFormData) {
    setSubmitError(null);
    try {
      await mutateAsync(data);
      form.reset();
      onOpenChange(false);
      navigate("/success");
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova solicitação de reembolso</DialogTitle>
          <DialogDescription>Dados da despesa para solicitar reembolso.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da solicitação</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="file"
              render={() => (
                <FormItem>
                  <FormControl>
                    <InputFile accept=".jpg,.jpeg,.png,.pdf" {...form.register("file")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError && (
              <p role="alert" className="text-sm text-destructive">
                {submitError}
              </p>
            )}

            <Button type="submit" disabled={isPending}>
              {isPending ? "Enviando…" : "Enviar"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: Adaptar os testes do dialog**

Em `RefundFormDialog.test.tsx`, a categoria passa a ser um `combobox`:

```tsx
// The category is now a real Select: it exposes the combobox role and its
// options are reachable by keyboard, which the old div-based popover could not
// do without hand-written key handling.
it("lets the user pick a category with the keyboard", async () => {
  renderDialog();

  await userEvent.click(screen.getByRole("combobox", { name: "Categoria" }));
  await userEvent.click(await screen.findByRole("option", { name: "Alimentação" }));

  expect(screen.getByRole("combobox", { name: "Categoria" })).toHaveTextContent("Alimentação");
});
```

Mantenha todas as asserções existentes de validação e submit; só os seletores mudam.

- [ ] **Step 7: Rodar os testes da feature**

Run: `npx vitest run src/features/refunds`
Expected: PASS, incluindo a auditoria `vitest-axe`.

- [ ] **Step 8: Suíte inteira + typecheck**

Run: `npm run test && npx tsc -b --noEmit`
Expected: verdes.

- [ ] **Step 9: Commit**

```bash
git add src/components/ui src/features/refunds
git commit -m "feat: rebuild the refund form dialog on shadcn dialog and select"
```

---

### Task 5: Backend — `sum_amount_in_cents` na listagem

Repositório **`Refund-api`**, branch própria. Independente do frontend; precisa estar pronto antes da Task 6.

**Files:**
- Modify: `src/models/repositories/refunds_repository.py:20-48`
- Modify: `src/models/repositories/interfaces/refunds_repository_interface.py:11-18`
- Modify: `src/models/repositories/refunds_repository_test.py`
- Modify: `src/controllers/refund_lister_controller.py:22-39`
- Modify: `src/controllers/refund_lister_controller_test.py`
- Modify: `docs/use-cases/UC-004-list-refunds.md`

**Interfaces:**
- Produces: `select_refunds(...) -> tuple[list[dict], int, int]` — `(refunds, total, total_amount_in_cents)`.
- Produces: campo `sum_amount_in_cents: int` no response de `GET /refunds`.

- [ ] **Step 1: Criar a branch**

```bash
cd ../Refund-api
git checkout -b feat/refund-list-sum
```

- [ ] **Step 2: Escrever o teste do controller primeiro**

Em `src/controllers/refund_lister_controller_test.py`, atualize a fixture para a nova tupla de três e acrescente o teste:

```python
@pytest.fixture
def mock_repository():
    mock_repo = MagicMock()
    # select_refunds now returns (rows, total, total_amount_in_cents).
    mock_repo.select_refunds = AsyncMock(return_value=([{"id": 1}, {"id": 2}], 2, 19290))
    return mock_repo


# The summary band on the Home shows a total in cents for the whole filtered
# set, not just the current page, so the controller must forward the sum the
# repository computed instead of adding up the page it received.
@pytest.mark.asyncio
async def test_response_includes_the_total_amount(mock_repository):
    controller = RefundListerController(mock_repository)

    response = await controller.list(page=1, per_page=10, user_id=7, role="standard")

    assert response["sum_amount_in_cents"] == 19290
```

- [ ] **Step 3: Rodar o teste para vê-lo falhar**

Run: `pytest src/controllers/refund_lister_controller_test.py -v`
Expected: FAIL — `ValueError: too many values to unpack` na desestruturação atual de duas variáveis.

- [ ] **Step 4: Atualizar a interface do repository**

```python
    @abstractmethod
    async def select_refunds(
        self,
        page: int,
        per_page: int,
        name: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> tuple[list[dict], int, int]:
        pass
```

- [ ] **Step 5: Atualizar o controller**

```python
        refunds, total, total_amount = await self.__refunds_repository.select_refunds(
            page=page, per_page=per_page, name=name, user_id=filter_user_id
        )

        return self.__format_response(refunds, total, total_amount, page, per_page)

    def __format_response(
        self, refunds: list, total: int, total_amount: int, page: int, per_page: int
    ) -> dict:
        return {
            "type": "Refund",
            "count": len(refunds),
            "total": total,
            "sum_amount_in_cents": total_amount,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if total else 0,
            "attributes": [self.__serialize(refund) for refund in refunds],
        }
```

- [ ] **Step 6: Rodar o teste do controller**

Run: `pytest src/controllers/refund_lister_controller_test.py -v`
Expected: PASS.

- [ ] **Step 7: Atualizar o repository**

Em `select_refunds`, a contagem e a soma passam a sair da **mesma** query — um round trip em vez de dois:

```python
            # count and sum share the same filters, so they ride in one query
            # instead of two round trips. SUM over an empty set returns NULL,
            # hence the `or 0`.
            totals_query = (
                select(func.count(), func.sum(Refunds.c.amount_in_cents))  # pylint: disable=not-callable
                .select_from(Refunds)
                .where(*filters)
            )
            total, total_amount = (await session.execute(totals_query)).one()
```

e o retorno vira:

```python
            return refunds, total, total_amount or 0
```

- [ ] **Step 8: Acrescentar o teste do repository**

Em `src/models/repositories/refunds_repository_test.py`, seguindo o padrão de mock de sessão já usado no arquivo:

```python
# The sum must cover every refund matching the filter, not just the page that
# was returned, and an empty result set must read as 0 rather than None.
@pytest.mark.asyncio
async def test_select_refunds_returns_zero_sum_when_there_are_no_rows():
    repository = RefundsRepository(mock_connection_returning(rows=[], totals=(0, None)))

    _, total, total_amount = await repository.select_refunds(page=1, per_page=10)

    assert total == 0
    assert total_amount == 0
```

Adapte `mock_connection_returning` ao helper/fixture que o arquivo já usa para simular a sessão; se não houver um, escreva-o no `conftest.py` local de `src/models/repositories/`.

- [ ] **Step 9: Rodar as verificações do backend**

Run: `pytest && pylint src`
Expected: ambos verdes.

- [ ] **Step 10: Atualizar o `UC-004`**

Em `docs/use-cases/UC-004-list-refunds.md`, acrescente `sum_amount_in_cents` ao contrato do response, descrevendo-o como "soma, em centavos, de todos os reembolsos que casam o filtro — respeitando a mesma regra de autorização da listagem (admin vê todos; usuário comum, apenas os seus)".

- [ ] **Step 11: Commit**

```bash
git add src/models/repositories src/controllers docs/use-cases/UC-004-list-refunds.md
git commit -m "feat: return the filtered refund total amount in the list response"
```

---

### Task 6: `PageHome` — layout de painel com faixa de resumo

Volta para o repositório `Refund-FrontEnd`.

**Files:**
- Modify: `src/features/refunds/schemas/refund.ts:38-46`
- Modify: `src/test/msw/handlers.ts`
- Modify: `src/pages/PageHome.tsx`
- Create: `src/pages/PageHome.test.tsx`
- Create: `src/components/ui/badge.tsx`, `src/components/ui/separator.tsx`, `src/components/ui/skeleton.tsx` (gerados pelo CLI)

**Interfaces:**
- Consumes: `sum_amount_in_cents` do response de `GET /refunds` (Task 5); `Card`, `CardHeader`, `CardTitle`, `CardContent`; `Button`; `Input`; `Skeleton`.
- Produces: `RefundsListResponse` com o campo `sum_amount_in_cents: number`.

- [ ] **Step 1: Gerar os componentes que faltam**

```bash
npx shadcn@latest add badge separator skeleton
```

- [ ] **Step 2: Acrescentar o campo ao schema de response**

Em `src/features/refunds/schemas/refund.ts`:

```ts
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
```

- [ ] **Step 3: Rodar os testes para vê-los falhar**

Run: `npx vitest run src/hooks/refundQueries.test.tsx`
Expected: FAIL — os handlers do MSW ainda não devolvem o campo novo, então o `parse` rejeita o response. É exatamente o comportamento que o Item 2 comprou: contrato quebrado vira `isError` em vez de dado inválido no cache.

- [ ] **Step 4: Atualizar os handlers do MSW**

Em `src/test/msw/handlers.ts`, o handler de listagem passa a incluir `sum_amount_in_cents` coerente com os itens devolvidos.

- [ ] **Step 5: Rodar os testes de query**

Run: `npx vitest run src/hooks/refundQueries.test.tsx`
Expected: PASS.

- [ ] **Step 6: Reescrever o `PageHome`**

Preserve intactos: `useLoaderData`, `useSearchParams`, `updateListLocation`, o debounce da busca e a normalização de parâmetros. Muda só a apresentação. Sai o `min-h-screen`/`max-w-2xl` — a página agora vive dentro do shell.

Estrutura alvo:

```tsx
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Solicitações</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total} ${data.total === 1 ? "solicitação" : "solicitações"}` : " "}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Solicitações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-semibold">{data?.total ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <p className="text-2xl font-semibold">
                {formatCentsToBRL(data?.sum_amount_in_cents ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <RefundSearch key={name ?? ""} initialSearch={name ?? ""} updateListLocation={updateListLocation} />

      {/* lista em painel + paginação (abaixo) */}
    </div>
  );
```

A busca vira `Input` com o ícone `Search` do lucide dentro do campo, e o botão de submit sai (o debounce já dispara a busca; mantenha o `onSubmit` do form para quem aperta Enter).

A lista vira um painel `rounded-xl border` com as linhas separadas por `border-b last:border-b-0`, cada uma um `Link` como hoje, com o ícone da categoria em `size-5 text-muted-foreground`.

A paginação vira:

```tsx
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label="Página anterior"
            disabled={data.page === 1}
            onClick={() => updateListLocation(name ?? "", Math.max(1, data.page - 1))}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {data.page} de {data.total_pages}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próxima página"
            disabled={data.page === data.total_pages}
            onClick={() => updateListLocation(name ?? "", Math.min(data.total_pages, data.page + 1))}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
```

Os ícones de categoria em `src/features/refunds/constants/categories.ts` passam a ser componentes lucide: `UtensilsCrossed`, `Bed`, `Car`, `Monitor`, `Wrench`. O tipo do campo `icon` muda de `FunctionComponent<SVGProps>` para `LucideIcon` — importe `type LucideIcon` de `lucide-react`.

- [ ] **Step 7: Escrever o teste do `PageHome`**

Arquivo novo `src/pages/PageHome.test.tsx`. A página depende de loader data, search params, Query e MSW, então renderize-a por um `createMemoryRouter` com o `QueryWrapper` de `src/test/utils.tsx`.

```tsx
// The summary band must show the totals the API reported for the whole filtered
// set — not a sum of the rows on the current page, which would be wrong as soon
// as there is more than one page.
it("shows the totals coming from the API", async () => {
  renderPageHome();

  expect(await screen.findByText("24")).toBeInTheDocument();
  expect(screen.getByText("R$ 4.182,00")).toBeInTheDocument();
});

// Pagination controls must be reachable by their accessible name, and the
// previous-page button must be disabled on the first page.
it("disables the previous page button on the first page", async () => {
  renderPageHome();

  expect(await screen.findByRole("button", { name: "Página anterior" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Próxima página" })).toBeEnabled();
});
```

Ajuste os valores esperados ao que o handler do MSW devolve.

- [ ] **Step 8: Rodar os testes da Home**

Run: `npx vitest run src/pages/PageHome.test.tsx`
Expected: PASS.

- [ ] **Step 9: Suíte inteira + typecheck**

Run: `npm run test && npx tsc -b --noEmit`
Expected: verdes.

- [ ] **Step 10: Commit**

```bash
git add src/pages/PageHome.tsx src/pages/PageHome.test.tsx src/features/refunds src/test/msw/handlers.ts src/components/ui
git commit -m "feat: rebuild the home as a panel layout with a summary band"
```

---

### Task 7: Shell — `ui/sidebar` e `ui/sheet`

Substitui o `react-pro-sidebar`. O `SidebarProvider` do shadcn persiste o estado por cookie; aqui ele é usado **controlado**, ligado ao store Zustand, para que a fonte única de estado de UI continue sendo `src/stores/ui.ts` (Item 12).

**Files:**
- Create: `src/components/ui/sidebar.tsx`, `src/components/ui/sheet.tsx`, `src/components/ui/tooltip.tsx`, `src/components/ui/dropdown-menu.tsx` (gerados pelo CLI)
- Create: `src/hooks/use-mobile.ts` (gerado pelo CLI)
- Modify: `src/components/core/Sidebar.tsx`
- Modify: `src/components/core/Topbar.tsx`
- Modify: `src/components/core/MainLayout.tsx`
- Modify: `src/components/core/nav-items.tsx`
- Modify: `src/components/core/Sidebar.test.tsx`, `Topbar.test.tsx`, `MainLayout.test.tsx`

**Interfaces:**
- Consumes: `useUiStore` (`sidebarCollapsed`, `toggleSidebar`, `theme`, `toggleTheme`) de `@/stores/ui`; `useAuth` de `@/context/useAuth`; `initialsFromName`, `usernameFromEmail` de `@/lib/profile`.
- Produces: `NAV_ITEMS: NavItem[]` com `icon: LucideIcon` em vez de `ReactNode`.

- [ ] **Step 1: Gerar os componentes**

```bash
npx shadcn@latest add sidebar sheet tooltip dropdown-menu
```

O CLI cria `src/hooks/use-mobile.ts`. Ele cai na camada `shared` do ESLint, que já é permitida — nenhuma mudança de configuração é necessária.

- [ ] **Step 2: Converter `nav-items.tsx` para lucide**

```tsx
import { CalendarDays, LayoutDashboard, ReceiptText, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  enabled: boolean;
}

// Only "Solicitações" is live now; the rest are placeholders for future cycles.
export const NAV_ITEMS: NavItem[] = [
  { label: "Solicitações", to: "/", icon: ReceiptText, enabled: true },
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, enabled: false },
  { label: "Time", to: "/team", icon: Users, enabled: false },
  { label: "Calendário", to: "/calendar", icon: CalendarDays, enabled: false },
];
```

Passar o componente (não um elemento já criado) permite ao consumidor escolher tamanho e `aria-hidden`.

- [ ] **Step 3: Reescrever `MainLayout.tsx` com o `SidebarProvider` controlado**

```tsx
import { useState } from "react";
import { Outlet, useMatches } from "react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useUiStore } from "@/stores/ui";
import { RefundFormDialog } from "@/features/refunds";

// Reads the deepest route handle that defines a title.
function useRouteTitle(): string {
  const matches = useMatches();
  const withTitle = [...matches]
    .reverse()
    .find((m) => (m.handle as { title?: string } | undefined)?.title);
  return (withTitle?.handle as { title?: string } | undefined)?.title ?? "";
}

export default function MainLayout() {
  const [isNewRefundOpen, setIsNewRefundOpen] = useState(false);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const title = useRouteTitle();

  return (
    // The provider is driven by the Zustand store instead of shadcn's cookie:
    // the store is already the single source of truth for UI preferences and is
    // persisted to localStorage (Item 12). `open` is the inverse of `collapsed`.
    <SidebarProvider open={!collapsed} onOpenChange={toggleSidebar}>
      <AppSidebar />
      <SidebarInset>
        <Topbar title={title} onNewRefund={() => setIsNewRefundOpen(true)} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </SidebarInset>
      <RefundFormDialog open={isNewRefundOpen} onOpenChange={setIsNewRefundOpen} />
    </SidebarProvider>
  );
}
```

O `drawerOpen` local desaparece: o `SidebarProvider` já gerencia o drawer mobile por dentro, via `Sheet`.

- [ ] **Step 4: Reescrever `Sidebar.tsx`**

Estrutura: `Sidebar collapsible="icon"` → `SidebarHeader` com o bloco de perfil (avatar de iniciais, nome, username), `SidebarContent` com `SidebarMenu` iterando `NAV_ITEMS`, `SidebarFooter` com o botão "Sair".

Pontos obrigatórios:
- item ativo via `SidebarMenuButton isActive={location.pathname === item.to}`;
- itens desabilitados com `disabled` e o texto "em breve" dentro de `SidebarMenuBadge`;
- link real com `asChild`: `<SidebarMenuButton asChild><Link to={item.to}>…</Link></SidebarMenuButton>`;
- `tooltip={item.label}` em cada `SidebarMenuButton`, que é o que dá o rótulo no modo icon rail;
- `handleLogout` mantendo `logout()` + `navigate("/login")`.

- [ ] **Step 5: Reescrever `Topbar.tsx`**

```tsx
import { Moon, Sun } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUiStore, resolveTheme } from "@/stores/ui";

interface TopbarProps {
  title: string;
  onNewRefund: () => void;
}

export default function Topbar({ title, onNewRefund }: TopbarProps) {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const isDark = resolveTheme(theme) === "dark";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Alternar tema" onClick={toggleTheme}>
          {isDark ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
        </Button>
        <Button onClick={onNewRefund}>Nova solicitação</Button>
      </div>
    </header>
  );
}
```

O `SidebarTrigger` substitui o botão "Abrir menu" — ele já alterna drawer no mobile e colapso no desktop.

- [ ] **Step 6: Adaptar os testes do shell**

Os três testes renderizam os componentes isolados; agora eles precisam do `SidebarProvider` em volta. Crie um helper local nos testes:

```tsx
// The shadcn sidebar reads its open/collapsed state from context, so every
// component under test has to be rendered inside the provider. The router
// wrapper is whatever the existing test in this file already uses (the sidebar
// renders <Link>, so it still needs one).
function renderInSidebar(ui: ReactNode) {
  return render(<MemoryRouter><SidebarProvider>{ui}</SidebarProvider></MemoryRouter>);
}
```

O teste do botão de colapso passa a procurar o `SidebarTrigger` pelo nome acessível que o shadcn dá a ele (`"Toggle Sidebar"`); se preferir manter o rótulo em português, passe `aria-label="Alternar menu"` explicitamente no `SidebarTrigger` do `Topbar` e ajuste o teste — **prefira esta segunda opção**, porque a regra do projeto é UI em português.

- [ ] **Step 7: Remover o `react-pro-sidebar` e o MUI**

```bash
npm uninstall react-pro-sidebar @mui/icons-material @mui/material @emotion/react @emotion/styled
```

- [ ] **Step 8: Confirmar que nada mais importa MUI**

Run: `grep -rn "@mui\|@emotion\|react-pro-sidebar" src`
Expected: nenhuma saída.

- [ ] **Step 9: Suíte inteira, typecheck e build**

Run: `npm run test && npx tsc -b --noEmit && npm run build`
Expected: verdes.

- [ ] **Step 10: Commit**

```bash
git add src/components/ui src/components/core src/hooks/use-mobile.ts package.json package-lock.json
git commit -m "feat: replace react-pro-sidebar with the shadcn sidebar"
```

---

### Task 8: Telas restantes

**Files:**
- Modify: `src/pages/PageRefundDetails.tsx`
- Modify: `src/pages/PageSuccess.tsx`
- Modify: `src/pages/PageRouteError.tsx`
- Modify: `src/pages/PageComponents.tsx`

**Interfaces:**
- Consumes: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `Button`, `Badge`, `Separator`, `Skeleton`, `Dialog`.

- [ ] **Step 1: `PageSuccess`**

```tsx
import { useNavigate } from "react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PageSuccess() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 p-6 text-center">
      <span className="flex size-20 items-center justify-center rounded-full border-4 border-primary">
        <Check className="size-10 text-primary" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">Solicitação enviada!</h1>
      <p className="text-sm text-muted-foreground">
        Agora é apenas aguardar! Sua solicitação será analisada e, em breve, o setor
        financeiro irá entrar em contato com você.
      </p>
      {/* Reabrir o modal direto daqui pede estado compartilhado entre páginas —
          fica pra quando entrarmos na sub-fase de contexts. Por enquanto, só
          volta pra Home. */}
      <Button onClick={() => navigate("/")}>Nova solicitação</Button>
    </div>
  );
}
```

- [ ] **Step 2: `PageRouteError`**

Mantenha `getErrorMessage` exatamente como está — é lógica, não apresentação. Só o markup muda: contêiner `mx-auto flex w-full max-w-md flex-col items-center gap-4 p-6 text-center`, `<h1 className="text-2xl font-semibold tracking-tight">Algo deu errado</h1>`, mensagem em `text-sm text-muted-foreground`, e o link virando `<Button asChild variant="outline"><Link to="/">Voltar para solicitações</Link></Button>`.

- [ ] **Step 3: `PageRefundDetails`**

Envolva o conteúdo num `Card`: `CardHeader` com o nome da solicitação em `CardTitle` e a categoria em `CardDescription`; `CardContent` com valor e comprovante; `CardFooter` com o botão de excluir em `variant="destructive"`. Os skeletons de carregamento passam a usar `@/components/ui/skeleton`. Preserve a lógica de exclusão e o dialog de confirmação, trocando só o `Dialog` antigo pelo `@/components/ui/dialog`.

- [ ] **Step 4: `PageComponents`**

Reconstrua como galeria dos componentes shadcn: uma seção por componente (`Button` em todas as variantes e tamanhos, `Input`, `Select`, `Dialog`, `Card`, `Badge`, `Skeleton`, `InputFile`), cada uma num `Card` com `CardTitle` nomeando o componente. É uma página de vitrine sem lógica; não precisa de teste.

- [ ] **Step 5: Suíte inteira, typecheck e build**

Run: `npm run test && npx tsc -b --noEmit && npm run build`
Expected: verdes.

- [ ] **Step 6: Commit**

```bash
git add src/pages
git commit -m "feat: rebuild the remaining screens on shadcn"
```

---

### Task 9: Limpeza — deletar o Atomic Design e zerar o lint

**Files:**
- Delete: `src/components/atoms/`, `src/components/molecules/`
- Delete: `src/assets/icons/{Bed,CaretDown,CaretLeft,CaretRight,Check,CloudArrowUp,DesktopTower,ForkKnife,MagnifyingGlass,PoliceCar,Spinner,Wrench}.svg`
- Modify: `src/assets/icons/icons.test.tsx`
- Modify: `eslint.config.js`
- Modify: `package.json`
- Modify: `AGENTS.md`

**Interfaces:**
- Produces: camada `ui` do ESLint apontando exclusivamente para `src/components/ui`.

- [ ] **Step 1: Confirmar que ninguém mais importa as pastas antigas**

Run: `grep -rn "components/atoms\|components/molecules" src`
Expected: nenhuma saída. Se aparecer algo, a tela correspondente ficou para trás numa task anterior — volte e termine antes de deletar.

- [ ] **Step 2: Deletar as pastas e os SVGs substituídos**

```bash
rm -rf src/components/atoms src/components/molecules
rm src/assets/icons/{Bed,CaretDown,CaretLeft,CaretRight,Check,CloudArrowUp,DesktopTower,ForkKnife,MagnifyingGlass,PoliceCar,Spinner,Wrench}.svg
```

`Receipt.svg` **fica** — é a marca usada no Login, Register e detalhe.

- [ ] **Step 3: Ajustar `icons.test.tsx`**

O teste hoje cobre os SVGs via svgr. Reduza-o ao `Receipt.svg`, que é o único que sobrou, preservando a asserção de que o ícone herda a cor via `currentColor` (a lição do commit `16f3308`).

- [ ] **Step 4: Remover `tailwind-variants` e `classnames`**

```bash
npm uninstall tailwind-variants classnames
```

- [ ] **Step 5: Fechar a camada `ui` do ESLint e silenciar a regra no código vendorizado**

Em `eslint.config.js`, a entrada da camada `ui` volta a ter um alvo só:

```js
{ type: 'ui', pattern: ['src/components/ui'] },
```

E acrescente um bloco de override, **depois** do bloco principal:

```js
  // Components under src/components/ui are copied verbatim from the shadcn
  // registry and export their cva variants next to the component itself
  // (Button + buttonVariants). That is exactly what react-refresh forbids, but
  // these files are vendored, not hand-edited, so the rule is off for them.
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
```

- [ ] **Step 6: Rodar o lint e conferir a meta**

Run: `npm run lint`
Expected: **0 erros, 0 warnings**. Era 18 antes do ciclo.

- [ ] **Step 7: Atualizar o `AGENTS.md`**

Duas frases deixam de ser verdade:
- Na seção "O projeto", a linha de stack: trocar `tailwind-variants` por `class-variance-authority` e substituir a descrição da estrutura por: "Design system em `src/components/ui` (shadcn/ui, código copiado do registry e versionado aqui); `src/components/core` guarda a composição do shell. As páginas ficam em `src/pages` e usam o prefixo `Page`."
- Em "Como trabalhar neste projeto", remover "Preserve a organização em Atomic Design ao criar ou mover componentes." e colocar no lugar: "Componentes novos do design system vêm do registry (`npx shadcn@latest add <componente>`) e ficam em `src/components/ui`. Só escreva um componente de UI à mão quando o registry não tiver equivalente."

Preserve a seção "Responsividade" inteira — as lições de `min-w-0` e largura de input continuam válidas.

- [ ] **Step 8: Verificação completa**

Run: `npm run test && npx tsc -b --noEmit && npm run build && npm run lint`
Expected: tudo verde, lint com 0 erros.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: drop the atomic design layer and clear the lint debt"
```

---

### Task 10: Documentação da trilha e fechamento

Fecha o ciclo conforme o `learning-path-workflow.md`.

**Files:**
- Modify: `../Refund-api/docs/learning-path-progress.md`
- Modify: `../Refund-api/docs/plans/current-state.md`
- Modify: `docs/superpowers/specs/2026-07-26-frontend-shell-sidebar-theme-design.md:39,218`

- [ ] **Step 1: Corrigir o roadmap do spec do shell**

Nas duas ocorrências de `@mui/x-data-grid` (linhas 39 e 218), troque por **TanStack Table**, mantendo a referência ao Item 13. É a mudança de documentação que o Gabriel pediu junto do restyle.

- [ ] **Step 2: Escrever a entrada do diário**

Em `../Refund-api/docs/learning-path-progress.md`, seguindo o formato das entradas anteriores: motivo do item; estado anterior com caminhos e trechos; limitação encontrada; comparação visual; estado ajustado com caminhos e trechos; arquivos modificados; verificações executadas com resultados; resumo do conceito.

O conceito a registrar é **copy-in versus dependency**, com a tabela do spec e o ponto honesto: possuir o código significa que bugs do componente viram bugs do projeto, e o repositório cresce. Registre também que o Item 10 foi visto duas vezes — integração (shell) e posse (shadcn) — e que o `ui/select` fechou a pendência de navegação por seta do `PopOverMenu`, e o `ui/input-file` fechou a pendência do campo `file` sem teste.

- [ ] **Step 3: Atualizar o `current-state.md`**

Acrescente o ciclo concluído; marque como resolvidas as pendências "A11y do `PopOverMenu`: navegação por setas", "Campo `file` do `refundCreateSchema` sem teste" e "Lint do frontend já vermelho antes da trilha"; atualize a seção de arquitetura do frontend (Atomic Design → `components/ui`); e aponte o próximo ciclo: **workflow de aprovação** (backend primeiro, puxando Alembic/Item 18 e Unit of Work/Item 20).

Se a validação em navegador não tiver sido feita, registre-a explicitamente como pendência — o workflow proíbe apresentar o item como totalmente validado sem ela.

- [ ] **Step 4: Verificação final nos dois repositórios**

Run (frontend): `npm run test && npx tsc -b --noEmit && npm run build && npm run lint`
Run (backend): `cd ../Refund-api && pytest && pylint src`
Expected: tudo verde.

- [ ] **Step 5: Commits**

```bash
# Refund-FrontEnd
git add docs/superpowers/specs/2026-07-26-frontend-shell-sidebar-theme-design.md
git commit -m "docs: point the roadmap at TanStack Table instead of MUI Data Grid"

# Refund-api
cd ../Refund-api
git add docs/learning-path-progress.md docs/plans/current-state.md
git commit -m "docs: record the shadcn restyle cycle (Item 10, second pass)"
```

- [ ] **Step 6: Apresentar o fechamento ao Gabriel**

O `learning-path-workflow.md` exige apresentar o fechamento e **aguardar autorização** antes de iniciar o próximo item. Não faça merge das branches nem inicie o ciclo do workflow de aprovação sem essa autorização.

---

## Notas de execução

- **A partir da Task 1 as telas ficam visualmente quebradas** até a task que migra cada uma. Isso é esperado: os tokens antigos deixam de existir de uma vez. Os testes não quebram por isso, porque verificam comportamento.
- **Ordem importa em dois pontos:** a Task 5 (backend) precisa estar pronta antes da Task 6 (Home), e a Task 9 (deletar) precisa vir depois de todas as telas.
- **Nunca afrouxe uma asserção** para fazer um teste passar após a troca de componente. Se um teste ficou impossível de escrever no novo componente, isso é um achado a relatar, não a contornar.
