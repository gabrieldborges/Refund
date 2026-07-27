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
