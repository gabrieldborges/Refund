import { useState } from "react";
import { Outlet, useMatches } from "react-router";
import { useTranslation } from "react-i18next";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useUiStore } from "@/stores/ui";
import { RefundFormDialog } from "@/features/refunds";

// The new-refund dialog's state lives here, but the success screen needs to
// reopen it. Rather than lifting that state into a global store (persisted
// to localStorage — a refresh would restore an open dialog) or a search
// param (which would reopen the form on refresh too), only the trigger
// travels down, through the mechanism the router already offers.
export interface MainLayoutOutletContext {
  openNewRefund: () => void;
}

// Reads the deepest route handle that defines a title. The handle carries a
// catalogue KEY, not display text: route definitions are evaluated once at
// module load, long before a locale is chosen, so translating there would
// freeze the title in whatever language happened to be active.
function useRouteTitle(): string {
  const { t } = useTranslation();
  const matches = useMatches();
  const withTitle = [...matches]
    .reverse()
    .find((m) => (m.handle as { titleKey?: string } | undefined)?.titleKey);
  const titleKey = (withTitle?.handle as { titleKey?: string } | undefined)?.titleKey;
  return titleKey ? t(titleKey) : "";
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
          <Outlet
            context={{ openNewRefund: () => setIsNewRefundOpen(true) } satisfies MainLayoutOutletContext}
          />
        </div>
      </SidebarInset>
      <RefundFormDialog open={isNewRefundOpen} onOpenChange={setIsNewRefundOpen} />
    </SidebarProvider>
  );
}
