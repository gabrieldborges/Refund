import { useState } from "react";
import { Outlet, useMatches } from "react-router";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
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
