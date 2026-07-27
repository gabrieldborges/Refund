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

  it("setSidebarCollapsed sets the explicit value regardless of the current one", () => {
    // Unlike toggleSidebar, this must be idempotent: setting the same value
    // twice in a row must not flip it back. This is what shadcn's
    // onOpenChange(open: boolean) callback relies on.
    useUiStore.getState().setSidebarCollapsed(true);
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
    useUiStore.getState().setSidebarCollapsed(true);
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
    useUiStore.getState().setSidebarCollapsed(false);
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });

  it("persists to localStorage under 'refund-ui'", () => {
    useUiStore.getState().setTheme("dark");
    expect(localStorage.getItem("refund-ui")).toContain("dark");
  });
});
