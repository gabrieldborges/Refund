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

  // Language and theme moved to the sidebar footer so the title and the primary
  // action stop competing for the narrow mobile header. Asserting their ABSENCE
  // here is what keeps them from quietly coming back and re-truncating the
  // title — their behaviour is covered in Sidebar.test.tsx now.
  it("no longer renders the language and theme controls", () => {
    render(
      <SidebarProvider>
        <Topbar title="X" onNewRefund={() => {}} />
      </SidebarProvider>,
    );
    expect(screen.queryByRole("button", { name: "Alternar tema" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Alternar idioma" })).not.toBeInTheDocument();
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

