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
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const title = useRouteTitle();

  return (
    // The provider is driven by the Zustand store instead of shadcn's cookie:
    // the store is already the single source of truth for UI preferences and is
    // persisted to localStorage (Item 12). `open` is the inverse of `collapsed`.
    // `onOpenChange` receives the explicit next open state (not a request to
    // flip), so it is wired to the setter action, not `toggleSidebar`.
    <SidebarProvider open={!collapsed} onOpenChange={(open) => setSidebarCollapsed(!open)}>
      <AppSidebar />
      <SidebarInset>
        <Topbar title={title} onNewRefund={() => setIsNewRefundOpen(true)} />
        {/* A plain div, not <main>: SidebarInset already renders as <main>
            (src/components/ui/sidebar.tsx), so a second <main> here would be
            a nested landmark — invalid HTML5 and confusing for AT navigation. */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </SidebarInset>
      <RefundFormDialog open={isNewRefundOpen} onOpenChange={setIsNewRefundOpen} />
    </SidebarProvider>
  );
}
