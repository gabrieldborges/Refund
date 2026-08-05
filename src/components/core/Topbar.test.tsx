import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarProvider } from "@/components/ui/sidebar";
import Topbar from "./Topbar";
import { useUiStore, DEFAULT_LOCALE } from "@/stores/ui";
import { setTestLocale } from "@/test/i18n";

beforeEach(() => {
  localStorage.clear();
  useUiStore.setState({ theme: "light", locale: DEFAULT_LOCALE, sidebarCollapsed: false });
});

// i18next is module-level state shared across every test file, so a test that
// switches language has to switch back or it leaks into whatever runs next.
afterEach(async () => {
  await setTestLocale(DEFAULT_LOCALE);
});

describe("Topbar", () => {
  it("renders the page title", () => {
    // Topbar renders SidebarTrigger, which reads state from context, so it
    // needs a SidebarProvider around it.
    render(
      <SidebarProvider>
        <Topbar title="Solicitações de reembolso" onNewRefund={() => {}} />
      </SidebarProvider>,
    );
    expect(screen.getByRole("heading", { name: "Solicitações de reembolso" })).toBeInTheDocument();
  });

  it("calls onNewRefund when the action button is clicked", async () => {
    const onNewRefund = vi.fn();
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <Topbar title="X" onNewRefund={onNewRefund} />
      </SidebarProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Nova solicitação" }));
    expect(onNewRefund).toHaveBeenCalledOnce();
  });

  it("toggles the theme in the store", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <Topbar title="X" onNewRefund={() => {}} />
      </SidebarProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Alternar tema" }));
    expect(useUiStore.getState().theme).toBe("dark");
  });

  it("gives the sidebar trigger a Portuguese accessible name", () => {
    // shadcn's SidebarTrigger defaults to the English "Toggle Sidebar" name;
    // this project's rule is Portuguese UI text, so Topbar overrides it.
    render(
      <SidebarProvider>
        <Topbar title="X" onNewRefund={() => {}} />
      </SidebarProvider>,
    );
    expect(screen.getByRole("button", { name: "Alternar menu" })).toBeInTheDocument();
  });
});

describe("Topbar language switcher", () => {
  // The click has to do two things: record the choice in the store AND load
  // the catalogue. Asserting only the store would pass even if the interface
  // never changed language, which is the whole point of the control.
  it("switches the store and the rendered copy to English", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <Topbar title="X" onNewRefund={() => {}} />
      </SidebarProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Alternar idioma" }));

    expect(useUiStore.getState().locale).toBe("en-US");
    expect(await screen.findByRole("button", { name: "New request" })).toBeInTheDocument();
  });

  // Toggling twice must land back where it started, which is what makes a
  // single button usable as a switch with two locales.
  it("switches back to Portuguese on a second toggle", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <Topbar title="X" onNewRefund={() => {}} />
      </SidebarProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Alternar idioma" }));
    await user.click(await screen.findByRole("button", { name: "Change language" }));

    expect(useUiStore.getState().locale).toBe("pt-BR");
    expect(await screen.findByRole("button", { name: "Nova solicitação" })).toBeInTheDocument();
  });
});
