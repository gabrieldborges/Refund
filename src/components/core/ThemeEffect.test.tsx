import { describe, it, expect, beforeEach } from "vitest";
import { act, render } from "@testing-library/react";
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
    // Wrap the external store update so React flushes the effect before asserting.
    act(() => {
      useUiStore.getState().setTheme("dark");
    });
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
