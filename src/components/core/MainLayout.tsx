import { useState } from "react";
import { Outlet } from "react-router";
import Header from "../organisms/Header";
import RefundFormDialog from "../organisms/RefundFormDialog";

export default function MainLayout() {
  const [isNewRefundOpen, setIsNewRefundOpen] = useState(false);

  return (
    <>
      <Header onNewRefund={() => setIsNewRefundOpen(true)} />
      <Outlet />
      <RefundFormDialog open={isNewRefundOpen} onOpenChange={setIsNewRefundOpen} />
    </>
  );
}
