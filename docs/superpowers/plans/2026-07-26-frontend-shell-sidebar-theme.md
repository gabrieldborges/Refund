# App Shell (Sidebar + Topbar + Theme) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `Header + Outlet` layout with an admin-panel shell — a themeable `react-pro-sidebar` + an actions topbar — and make the whole app light/dark themeable via CSS-variable tokens, with UI preferences persisted in a Zustand store.

**Architecture:** Colors become semantic CSS-variable tokens on `:root` / `:root[data-theme="dark"]`; Tailwind utilities and `react-pro-sidebar` both read those variables, so one attribute flip re-themes everything. A persisted Zustand store holds `theme` and `sidebarCollapsed`; a small effect applies `data-theme` to `<html>`. The shell (`Sidebar`, `Topbar`, `MainLayout`) lives in the `app` layer (`components/core/`); the store and pure helpers live in the `shared` layer.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, react-pro-sidebar, @mui/icons-material (+ @mui/material + Emotion peers), zustand, React Router 7, Vitest + Testing Library.

## Global Constraints

- Comments in test files and new code: **English**, short and descriptive (per `AGENTS.md`). UI text: **Portuguese**.
- Tests are **colocated** next to the code (`*.test.ts(x)`), never batched at the end.
- After every task run: `npx tsc -b --noEmit`, `npm run test`, `npm run lint`. Lint must stay at **18 pre-existing `react-refresh` errors, 0 new** (including 0 `boundaries/*`).
- Respect the **Item 9 boundaries**: `Sidebar`/`Topbar`/`MainLayout` are `app` (in `components/core/`); the store and helpers are `shared`. The new `src/stores/` folder is added to the `shared` element in `eslint.config.js`.
- **Do not touch the backend.** Profile avatar/username are derived on the frontend.
- Theme colors are referenced only through the **semantic tokens** (`surface`, `app`, `subtle`, `line`, `content`, `muted`, `accent`, `accent-strong`, `on-accent`, `accent-soft`, `error`) — no new hardcoded hex in components.
- Import the feature only through its façade; use the `@/` alias for cross-folder imports.

---

### Task 1: Dependencies + theme tokens foundation

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `src/index.css` (CSS-variable tokens + Tailwind theme wiring)

**Interfaces:**
- Produces: semantic Tailwind color utilities (`bg-surface`, `bg-app`, `bg-subtle`, `border-line`, `text-content`, `text-muted`, `text-accent`, `bg-accent`, `text-on-accent`, `bg-accent-soft`, `text-error`, etc.) that flip under `:root[data-theme="dark"]`. The legacy palette (`white`, `gray-*`, `green-*`) is kept temporarily so unmigrated components keep compiling until Task 8.

- [ ] **Step 1: Install dependencies**

```bash
npm install react-pro-sidebar @mui/icons-material @mui/material @emotion/react @emotion/styled zustand
```

- [ ] **Step 2: Rewrite `src/index.css` with theme tokens**

```css
@import 'tailwindcss';
@import "tw-animate-css";

/* Raw palette per theme. These are the single source of truth for color;
   both Tailwind utilities and react-pro-sidebar read them via var(). */
:root {
  --surface: #ffffff;  --app: #F9FBFA;  --subtle: #E4ECE9;  --line: #CDD5D2;
  --content: #1F2523;  --muted: #4D5C57;
  --accent: #1F8459;   --accent-strong: #2CB178;  --on-accent: #ffffff;
  --accent-soft: #E5F4EE;  --error: #D14343;
}
:root[data-theme="dark"] {
  --surface: #161B20;  --app: #0F1215;  --subtle: #20262C;  --line: #242A30;
  --content: #E6E8EA;  --muted: #9AA4AD;
  --accent: #2FAE7C;   --accent-strong: #34D399;  --on-accent: #06231A;
  --accent-soft: #12352A;  --error: #E4756B;
}

@theme {
  --color-*: initial;

  /* Semantic, theme-aware tokens (chained var() resolves at runtime). */
  --color-surface: var(--surface);
  --color-app: var(--app);
  --color-subtle: var(--subtle);
  --color-line: var(--line);
  --color-content: var(--content);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-accent-strong: var(--accent-strong);
  --color-on-accent: var(--on-accent);
  --color-accent-soft: var(--accent-soft);
  --color-error: var(--error);

  /* Legacy palette — kept only until Task 8 migrates the components. */
  --color-white: #ffffff;
  --color-gray-100: #1F2523;
  --color-gray-200: #4D5C57;
  --color-gray-300: #CDD5D2;
  --color-gray-400: #E4ECE9;
  --color-gray-500: #F9FBFA;
  --color-green-100: #1F8459;
  --color-green-200: #2CB178;

  --font-sans: "Open Sans", sans-serif;
}

/* App-level base so background/text follow the theme everywhere. */
body {
  background-color: var(--app);
  color: var(--content);
}
```

- [ ] **Step 3: Verify build and types**

Run: `npx tsc -b --noEmit && npm run build`
Expected: both succeed (only the pre-existing >500 kB chunk warning).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/index.css
git commit -m "feat: add shell deps and theme-aware CSS-variable tokens"
```

---

### Task 2: Profile helpers (initials + username)

**Files:**
- Create: `src/lib/profile.ts`
- Test: `src/lib/profile.test.ts`

**Interfaces:**
- Produces: `initialsFromName(name: string): string` and `usernameFromEmail(email: string): string`. Consumed by `Sidebar` (Task 6).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/profile.test.ts
import { describe, it, expect } from "vitest";
import { initialsFromName, usernameFromEmail } from "./profile";

describe("initialsFromName", () => {
  // Two-word name uses first letter of first and last word.
  it("takes first and last initials", () => {
    expect(initialsFromName("Gabriel Dantas")).toBe("GD");
  });
  // Single-word name falls back to its first two letters.
  it("handles a single word", () => {
    expect(initialsFromName("Gabriel")).toBe("GA");
  });
  // Extra spaces do not produce empty initials.
  it("ignores surrounding whitespace", () => {
    expect(initialsFromName("  Ana  Lima  ")).toBe("AL");
  });
});

describe("usernameFromEmail", () => {
  // Local part before @ becomes the username handle.
  it("derives the handle from the local part", () => {
    expect(usernameFromEmail("gabriel@example.com")).toBe("@gabriel");
  });
  // Dots in the local part are preserved.
  it("keeps dots", () => {
    expect(usernameFromEmail("ana.lima@x.com")).toBe("@ana.lima");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/profile.test.ts`
Expected: FAIL ("initialsFromName is not a function" / module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/profile.ts

// Uppercase initials: first letter of the first and last words, or the first
// two letters when there is a single word.
export function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Frontend-derived handle from the email local part (before "@").
export function usernameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  return `@${local}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/profile.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile.ts src/lib/profile.test.ts
git commit -m "feat: derive avatar initials and username from user fields"
```

---

### Task 3: UI store (Zustand) + boundaries update

**Files:**
- Create: `src/stores/ui.ts`
- Test: `src/stores/ui.test.ts`
- Modify: `eslint.config.js` (add `src/stores` to the `shared` element)

**Interfaces:**
- Produces:
  - `type Theme = "light" | "dark" | "system"`
  - `resolveTheme(theme: Theme): "light" | "dark"` (exported pure helper)
  - `useUiStore` — Zustand store with `{ theme: Theme; sidebarCollapsed: boolean; setTheme(t): void; toggleTheme(): void; toggleSidebar(): void }`, persisted to `localStorage` key `"refund-ui"`. Consumed by Tasks 4, 5, 6.

- [ ] **Step 1: Add `src/stores` to the `shared` boundaries element**

In `eslint.config.js`, change the `shared` descriptor:

```js
{ type: 'shared', pattern: ['src/lib', 'src/hooks', 'src/stores'] },
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/stores/ui.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useUiStore, resolveTheme } from "./ui";

// Reset store + persisted state between tests.
beforeEach(() => {
  localStorage.clear();
  useUiStore.setState({ theme: "system", sidebarCollapsed: false });
});

describe("resolveTheme", () => {
  it("passes explicit themes through", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });
});

describe("useUiStore", () => {
  it("toggleTheme flips the resolved theme to its opposite", () => {
    useUiStore.getState().setTheme("light");
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe("dark");
  });

  it("toggleSidebar flips the collapsed flag", () => {
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it("persists to localStorage under 'refund-ui'", () => {
    useUiStore.getState().setTheme("dark");
    expect(localStorage.getItem("refund-ui")).toContain("dark");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- src/stores/ui.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Write minimal implementation**

```ts
// src/stores/ui.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

// Resolve "system" against the OS preference; explicit values pass through.
export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

interface UiState {
  theme: Theme;
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: "system",
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      // Flip to the opposite of whatever is currently showing.
      toggleTheme: () =>
        set({ theme: resolveTheme(get().theme) === "dark" ? "light" : "dark" }),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: "refund-ui" },
  ),
);
```

- [ ] **Step 5: Run test + lint to verify**

Run: `npm run test -- src/stores/ui.test.ts && npm run lint`
Expected: tests PASS; lint stays at 18 pre-existing, 0 new (the `src/stores` element is now recognized).

- [ ] **Step 6: Commit**

```bash
git add src/stores/ui.ts src/stores/ui.test.ts eslint.config.js
git commit -m "feat: add persisted Zustand UI store (theme + sidebar)"
```

---

### Task 4: Theme effect + matchMedia test mock

**Files:**
- Create: `src/components/core/ThemeEffect.tsx`
- Test: `src/components/core/ThemeEffect.test.tsx`
- Modify: `src/test/setup.ts` (add a `matchMedia` mock — jsdom lacks it)
- Modify: `src/App.tsx` (mount `ThemeEffect`)

**Interfaces:**
- Consumes: `useUiStore`, `resolveTheme` (Task 3).
- Produces: `ThemeEffect` — a render-null component that writes `document.documentElement.dataset.theme` from the store and keeps it in sync.

- [ ] **Step 1: Add a matchMedia mock to the test setup**

Append to `src/test/setup.ts`:

```ts
// jsdom has no matchMedia; the theme store queries it. Default to light.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/core/ThemeEffect.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import ThemeEffect from "./ThemeEffect";
import { useUiStore } from "@/stores/ui";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  useUiStore.setState({ theme: "system", sidebarCollapsed: false });
});

describe("ThemeEffect", () => {
  // The resolved theme is written to <html data-theme>.
  it("applies the store theme to the document element", () => {
    useUiStore.setState({ theme: "dark" });
    render(<ThemeEffect />);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  // A later store change updates the attribute.
  it("reacts to theme changes", () => {
    render(<ThemeEffect />);
    useUiStore.getState().setTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- src/components/core/ThemeEffect.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Write minimal implementation**

```tsx
// src/components/core/ThemeEffect.tsx
import { useEffect } from "react";
import { useUiStore, resolveTheme } from "@/stores/ui";

// Applies the resolved theme to <html data-theme>. Renders nothing.
export default function ThemeEffect() {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = resolveTheme(theme);
  }, [theme]);

  return null;
}
```

- [ ] **Step 5: Mount it in `App.tsx`**

```tsx
import { RouterProvider } from "react-router/dom";
import { AuthProvider } from "./context/AuthContext";
import ThemeEffect from "./components/core/ThemeEffect";
import { router } from "./router";

export default function App() {
  return (
    <AuthProvider>
      <ThemeEffect />
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- src/components/core/ThemeEffect.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/core/ThemeEffect.tsx src/components/core/ThemeEffect.test.tsx src/test/setup.ts src/App.tsx
git commit -m "feat: apply persisted theme to the document element"
```

---

### Task 5: Topbar

**Files:**
- Create: `src/components/core/Topbar.tsx`
- Test: `src/components/core/Topbar.test.tsx`

**Interfaces:**
- Consumes: `useUiStore` + `resolveTheme` (theme toggle); `@mui/icons-material` icons; React Router `useMatches` (route title).
- Produces: `Topbar` with props `{ title: string; onNewRefund: () => void; onOpenSidebar: () => void }`. (The page title is resolved by the caller — `MainLayout` — from route `handle`, and passed in; keeps `Topbar` pure and easy to test.)

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/core/Topbar.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Topbar from "./Topbar";
import { useUiStore } from "@/stores/ui";

beforeEach(() => {
  localStorage.clear();
  useUiStore.setState({ theme: "light", sidebarCollapsed: false });
});

describe("Topbar", () => {
  it("renders the page title", () => {
    render(<Topbar title="Solicitações de reembolso" onNewRefund={() => {}} onOpenSidebar={() => {}} />);
    expect(screen.getByRole("heading", { name: "Solicitações de reembolso" })).toBeInTheDocument();
  });

  it("calls onNewRefund when the action button is clicked", async () => {
    const onNewRefund = vi.fn();
    const user = userEvent.setup();
    render(<Topbar title="X" onNewRefund={onNewRefund} onOpenSidebar={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Nova solicitação" }));
    expect(onNewRefund).toHaveBeenCalledOnce();
  });

  it("toggles the theme in the store", async () => {
    const user = userEvent.setup();
    render(<Topbar title="X" onNewRefund={() => {}} onOpenSidebar={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Alternar tema" }));
    expect(useUiStore.getState().theme).toBe("dark");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/core/Topbar.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/core/Topbar.tsx
import MenuIcon from "@mui/icons-material/Menu";
import AddIcon from "@mui/icons-material/Add";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useUiStore, resolveTheme } from "@/stores/ui";
import Button from "../molecules/Button";

interface TopbarProps {
  title: string;
  onNewRefund: () => void;
  onOpenSidebar: () => void;
}

export default function Topbar({ title, onNewRefund, onOpenSidebar }: TopbarProps) {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const isDark = resolveTheme(theme) === "dark";

  return (
    <header className="flex items-center gap-3 border-b border-line bg-surface px-4 sm:px-6 h-14">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Abrir menu"
        className="md:hidden text-content cursor-pointer"
      >
        <MenuIcon aria-hidden fontSize="small" />
      </button>

      <h1 className="text-content font-semibold text-base sm:text-lg truncate">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Alternar tema"
          className="text-content cursor-pointer flex items-center"
        >
          {isDark ? <DarkModeIcon aria-hidden fontSize="small" /> : <LightModeIcon aria-hidden fontSize="small" />}
        </button>
        <Button variant="primary" size="fit" onClick={onNewRefund}>
          <span className="flex items-center gap-1"><AddIcon aria-hidden fontSize="small" /> Nova solicitação</span>
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/core/Topbar.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/core/Topbar.tsx src/components/core/Topbar.test.tsx
git commit -m "feat: add shell topbar with theme toggle and new-refund action"
```

---

### Task 6: Sidebar (react-pro-sidebar)

**Files:**
- Create: `src/components/core/Sidebar.tsx`
- Create: `src/components/core/nav-items.tsx` (nav config, so it is testable/extensible)
- Test: `src/components/core/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `useUiStore` (collapsed state), `useAuth` (user + logout), `initialsFromName`/`usernameFromEmail` (Task 2), `@mui/icons-material` icons, `react-pro-sidebar`, React Router `Link`/`useNavigate`.
- Produces: `Sidebar` with props `{ toggled: boolean; onBackdropClick: () => void }` (mobile drawer control comes from `MainLayout`). Nav config `NAV_ITEMS: { label: string; to: string; icon: ReactNode; enabled: boolean }[]`.

- [ ] **Step 1: Create the nav config**

```tsx
// src/components/core/nav-items.tsx
import type { ReactNode } from "react";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupIcon from "@mui/icons-material/Group";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

export interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
  enabled: boolean;
}

// Only "Solicitações" is live now; the rest are placeholders for future cycles.
export const NAV_ITEMS: NavItem[] = [
  { label: "Solicitações", to: "/", icon: <ReceiptLongIcon fontSize="small" />, enabled: true },
  { label: "Dashboard", to: "/dashboard", icon: <DashboardIcon fontSize="small" />, enabled: false },
  { label: "Time", to: "/team", icon: <GroupIcon fontSize="small" />, enabled: false },
  { label: "Calendário", to: "/calendar", icon: <CalendarMonthIcon fontSize="small" />, enabled: false },
];
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/core/Sidebar.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import Sidebar from "./Sidebar";
import { AuthContext } from "@/context/auth-context";
import { useUiStore } from "@/stores/ui";

const logout = vi.fn();

// Renders the sidebar inside a router + a fake auth context.
function renderSidebar() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          user: { name: "Gabriel Dantas", email: "gabriel@x.com", role: "standard" },
          isAuthenticated: true,
          login: vi.fn(),
          register: vi.fn(),
          logout,
        }}
      >
        <Sidebar toggled={false} onBackdropClick={() => {}} />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useUiStore.setState({ theme: "light", sidebarCollapsed: false });
  logout.mockClear();
});

describe("Sidebar", () => {
  it("shows derived profile initials and username", () => {
    renderSidebar();
    expect(screen.getByText("GD")).toBeInTheDocument();
    expect(screen.getByText("@gabriel")).toBeInTheDocument();
  });

  it("links the active item to the home route", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /Solicitações/ })).toHaveAttribute("href", "/");
  });

  it("does not render coming-soon items as links", () => {
    renderSidebar();
    expect(screen.queryByRole("link", { name: /Dashboard/ })).not.toBeInTheDocument();
  });

  it("logs out and navigates when Sair is clicked", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(logout).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- src/components/core/Sidebar.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Write minimal implementation**

```tsx
// src/components/core/Sidebar.tsx
import { Sidebar as ProSidebar, Menu, MenuItem } from "react-pro-sidebar";
import { Link, useLocation, useNavigate } from "react-router";
import LogoutIcon from "@mui/icons-material/Logout";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useAuth } from "@/context/useAuth";
import { useUiStore } from "@/stores/ui";
import { initialsFromName, usernameFromEmail } from "@/lib/profile";
import { NAV_ITEMS } from "./nav-items";

interface SidebarProps {
  toggled: boolean;
  onBackdropClick: () => void;
}

export default function Sidebar({ toggled, onBackdropClick }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <ProSidebar
      collapsed={collapsed}
      toggled={toggled}
      onBackdropClick={onBackdropClick}
      breakPoint="md"
      backgroundColor="var(--surface)"
      rootStyles={{ color: "var(--content)", borderColor: "var(--line)" }}
    >
      <div className="flex items-center justify-between p-4 border-b border-line">
        {!collapsed && user && (
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-full bg-accent text-on-accent flex items-center justify-center text-sm font-semibold shrink-0">
              {initialsFromName(user.name)}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-content truncate">{user.name}</span>
              <span className="block text-xs text-muted truncate">{usernameFromEmail(user.email)}</span>
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="text-muted cursor-pointer flex items-center"
        >
          {collapsed ? <ChevronRightIcon aria-hidden fontSize="small" /> : <ChevronLeftIcon aria-hidden fontSize="small" />}
        </button>
      </div>

      <Menu
        menuItemStyles={{
          button: ({ active, disabled }) => ({
            color: disabled ? "var(--muted)" : "var(--content)",
            backgroundColor: active ? "var(--accent-soft)" : undefined,
            opacity: disabled ? 0.6 : 1,
            "&:hover": { backgroundColor: disabled ? undefined : "var(--subtle)" },
          }),
        }}
      >
        {NAV_ITEMS.map((item) =>
          item.enabled ? (
            <MenuItem
              key={item.to}
              icon={item.icon}
              active={location.pathname === item.to}
              component={<Link to={item.to} />}
            >
              {item.label}
            </MenuItem>
          ) : (
            <MenuItem key={item.to} icon={item.icon} disabled suffix={collapsed ? undefined : <span className="text-[10px] uppercase text-muted">em breve</span>}>
              {item.label}
            </MenuItem>
          ),
        )}
      </Menu>

      <div className="mt-auto p-2">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-content hover:bg-subtle cursor-pointer"
        >
          <LogoutIcon aria-hidden fontSize="small" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </button>
      </div>
    </ProSidebar>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- src/components/core/Sidebar.test.tsx`
Expected: PASS (4 tests). If react-pro-sidebar renders disabled `MenuItem` as a link, adjust the test's coming-soon assertion to check for the `disabled` styling/absence of `href`; the implementation must ensure disabled items are not navigable.

- [ ] **Step 6: Commit**

```bash
git add src/components/core/Sidebar.tsx src/components/core/nav-items.tsx src/components/core/Sidebar.test.tsx
git commit -m "feat: add themed react-pro-sidebar with profile and nav"
```

---

### Task 7: MainLayout rewrite + route titles + remove Header

**Files:**
- Modify: `src/components/core/MainLayout.tsx`
- Modify: `src/router.tsx` (add `handle: { title }` per route)
- Delete: `src/components/organisms/Header.tsx`
- Test: `src/components/core/MainLayout.test.tsx`

**Interfaces:**
- Consumes: `Sidebar` (Task 6), `Topbar` (Task 5), `RefundFormDialog` (feature façade), React Router `useMatches`.
- Produces: the assembled shell. Route `handle` shape: `{ title: string }`.

- [ ] **Step 1: Add titles to the routes in `src/router.tsx`**

Add `handle: { title: "..." }` to the shell child routes:

```tsx
{ index: true, loader: homeLoader, handle: { title: "Solicitações de reembolso" },
  lazy: async () => ({ Component: (await import("./pages/PageHome")).default }) },
{ path: "/refunds/:id", loader: refundDetailLoader, handle: { title: "Detalhe da solicitação" },
  lazy: async () => ({ Component: (await import("./pages/PageRefundDetails")).default }) },
{ path: "/success", handle: { title: "Sucesso" },
  lazy: async () => ({ Component: (await import("./pages/PageSuccess")).default }) },
{ path: "/components", handle: { title: "Componentes" },
  lazy: async () => ({ Component: (await import("./pages/PageComponents")).default }) },
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/core/MainLayout.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import MainLayout from "./MainLayout";
import { AuthContext } from "@/context/auth-context";
import { useUiStore } from "@/stores/ui";

// Mount MainLayout as a route with a title handle and a child page.
function renderShell() {
  const router = createMemoryRouter(
    [
      {
        Component: MainLayout,
        children: [{ index: true, handle: { title: "Solicitações de reembolso" }, element: <p>home page</p> }],
      },
    ],
    { initialEntries: ["/"] },
  );
  return render(
    <AuthContext.Provider
      value={{
        user: { name: "Gabriel Dantas", email: "gabriel@x.com", role: "standard" },
        isAuthenticated: true, login: vi.fn(), register: vi.fn(), logout: vi.fn(),
      }}
    >
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useUiStore.setState({ theme: "light", sidebarCollapsed: false });
});

describe("MainLayout", () => {
  it("renders the route title in the topbar and the child via Outlet", () => {
    renderShell();
    expect(screen.getByRole("heading", { name: "Solicitações de reembolso" })).toBeInTheDocument();
    expect(screen.getByText("home page")).toBeInTheDocument();
  });

  it("shows the profile from the sidebar", () => {
    renderShell();
    expect(screen.getByText("@gabriel")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- src/components/core/MainLayout.test.tsx`
Expected: FAIL (MainLayout still renders the old Header / no title).

- [ ] **Step 4: Rewrite `MainLayout.tsx`**

```tsx
// src/components/core/MainLayout.tsx
import { useState } from "react";
import { Outlet, useMatches } from "react-router";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { RefundFormDialog } from "@/features/refunds";

// Reads the deepest route handle that defines a title.
function useRouteTitle(): string {
  const matches = useMatches();
  const withTitle = [...matches].reverse().find(
    (m) => (m.handle as { title?: string } | undefined)?.title,
  );
  return (withTitle?.handle as { title?: string } | undefined)?.title ?? "";
}

export default function MainLayout() {
  const [isNewRefundOpen, setIsNewRefundOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const title = useRouteTitle();

  return (
    <div className="flex h-screen bg-app">
      <Sidebar toggled={drawerOpen} onBackdropClick={() => setDrawerOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          title={title}
          onNewRefund={() => setIsNewRefundOpen(true)}
          onOpenSidebar={() => setDrawerOpen(true)}
        />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <RefundFormDialog open={isNewRefundOpen} onOpenChange={setIsNewRefundOpen} />
    </div>
  );
}
```

- [ ] **Step 5: Delete the old Header**

```bash
git rm src/components/organisms/Header.tsx
```

Confirm nothing imports it:

Run: `grep -rn "organisms/Header" src` → Expected: no matches.

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- src/components/core/MainLayout.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 7: Full check + commit**

Run: `npx tsc -b --noEmit && npm run test && npm run lint`
Expected: types 0; all tests green; lint 18 pre-existing, 0 new.

```bash
git add src/components/core/MainLayout.tsx src/components/core/MainLayout.test.tsx src/router.tsx
git commit -m "feat: assemble the app shell (sidebar + topbar) and drop the old header"
```

---

### Task 8: Migrate app colors to semantic tokens

**Files (migrate palette utilities → semantic tokens; counts are current usages):**
- `src/pages/PageHome.tsx`, `PageRefundDetails.tsx`, `PageRegister.tsx`, `PageLogin.tsx`, `PageSuccess.tsx`, `PageRouteError.tsx`
- `src/components/molecules/InputLabelWrapper.tsx`, `InputFile.tsx`, `PopOverMenu.tsx`, `Button.tsx`, `ButtonIcon.tsx`, `InputText.tsx`, `Dialog.tsx`
- `src/components/atoms/NavLink.tsx`, `Skeleton.tsx`
- `src/features/refunds/components/RefundFormDialog.tsx`
- Modify: `src/index.css` (remove the legacy palette once migration is done)

**Interfaces:** none new — this is a mechanical color migration that must not change behavior (only which token a color reads from).

**Mapping (apply to the color-name segment of every `bg-/text-/border-/fill-/ring-` utility):**

| Legacy | Semantic token |
|---|---|
| `white` | `surface` |
| `gray-500` (#F9FBFA) | `app` |
| `gray-400` (#E4ECE9) | `subtle` |
| `gray-300` (#CDD5D2) | `line` |
| `gray-200` (#4D5C57) | `muted` |
| `gray-100` (#1F2523) | `content` |
| `green-100` (#1F8459) | `accent` |
| `green-200` (#2CB178) | `accent-strong` |
| `error` | `error` (unchanged) |

- [ ] **Step 1: Migrate one file and run its test (repeat per file)**

For each file above, replace the color-name segment per the mapping (e.g. `bg-white` → `bg-surface`, `text-gray-100` → `text-content`, `border-gray-300` → `border-line`, `fill-green-100` → `fill-accent`). Do NOT change the `bg-/text-/border-/fill-` prefix or any layout classes. After each file that has a colocated test, run it:

Run: `npm run test -- <path-to-that-file-test>`
Expected: PASS (behavior unchanged — these tests assert roles/labels, not classes).

- [ ] **Step 2: Verify no legacy palette usage remains**

Run:
```bash
grep -rEn "(bg|text|border|fill|ring|from|to|via)-(white|gray-[0-9]|green-[0-9])" src || echo "clean"
```
Expected: `clean` (no matches). `error` may remain — it stays a semantic token.

- [ ] **Step 3: Remove the legacy palette from `src/index.css`**

Delete the "Legacy palette" block (the `--color-white`, `--color-gray-*`, `--color-green-*` lines) from `@theme`.

- [ ] **Step 4: Full verification**

Run: `npx tsc -b --noEmit && npm run test && npm run build && npm run lint`
Expected: types 0; all tests green; build ok; lint 18 pre-existing, 0 new.

- [ ] **Step 5: Manual dark-mode sanity (browser)**

Run the app, toggle the theme, and confirm Home, the refund dialog, login and detail pages all switch cleanly (no white boxes stuck in dark mode). Record the result; this is the check tests cannot cover (jsdom has no CSS).

- [ ] **Step 6: Commit**

```bash
git add src/ && git commit -m "refactor: migrate app colors to theme-aware semantic tokens"
```

---

## Self-Review

**1. Spec coverage:**
- Shell layout B (sidebar + topbar) → Tasks 5, 6, 7. ✓
- Icon rail collapse + mobile drawer → Task 6 (`collapsed`, `toggled`, `breakPoint`) + Task 7 (drawer state). ✓
- Profile derived (initials + username) → Task 2 + Task 6. ✓
- Nav: Solicitações + "em breve" → Task 6 (`nav-items.tsx`). ✓
- Theme by CSS vars, app-wide → Task 1 (tokens) + Task 8 (migration). ✓
- Zustand persisted store (theme + sidebar), system default → Task 3. ✓
- Theme applied to `<html>` → Task 4. ✓
- Topbar: route-handle title + theme toggle + new-refund → Tasks 5, 7. ✓
- react-pro-sidebar themed via `var(--…)` → Task 6. ✓
- `@mui/icons-material` → Tasks 5, 6. ✓
- A11y (aria-labels, aria-current, aria-hidden icons) → Tasks 5, 6. ✓
- Boundaries (`stores` in `shared`; shell in `app`) → Task 3 (eslint) + placement. ✓
- Tests plan → Tasks 2–7. ✓
- Remove old Header → Task 7. ✓

**2. Placeholder scan:** No "TBD/TODO"; every code step has real code; the migration task gives the exact mapping + file list instead of a vague "migrate colors". ✓

**3. Type consistency:** `resolveTheme`/`useUiStore` shape defined in Task 3 and consumed with the same names in Tasks 4, 5; `initialsFromName`/`usernameFromEmail` defined in Task 2 and used in Task 6; `NavItem`/`NAV_ITEMS` defined and consumed in Task 6; `Topbar`/`Sidebar` prop shapes defined in Tasks 5/6 and used in Task 7. ✓

## Learning Path closure (after all tasks)

Following `learning-path-workflow.md`: update `learning-path-progress.md` and `current-state.md` in `Refund-api` recording this cycle as the **Item 12 (Zustand)** vehicle and the **reinterpreted Item 10** (integrating/theming react-pro-sidebar instead of building a pattern). Commit docs in `Refund-api`.
