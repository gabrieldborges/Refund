import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarProvider } from "@/components/ui/sidebar";
import Topbar from "./Topbar";
import { useUiStore } from "@/stores/ui";

beforeEach(() => {
  localStorage.clear();
  useUiStore.setState({ theme: "light", sidebarCollapsed: false });
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
