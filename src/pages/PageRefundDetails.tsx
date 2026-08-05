import { useState } from "react";
import { useNavigate, useNavigation, useParams } from "react-router";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CATEGORIES,
  REFUND_STATUS,
  ReceiptPreview,
  ReviewTimeline,
  useDeleteRefund,
  useRefund,
} from "@/features/refunds";
import { getApiErrorMessage } from "@/lib/api";
import { formatCentsToBRL } from "@/lib/format";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useValueChanged } from "@/hooks/useEnteredItems";

export default function PageRefundDetails() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: refund, isLoading, isError } = useRefund(id);

  // True only for the render where the status actually changed — approving or
  // paying from the review screen invalidates this query, so the new value
  // arrives here without a remount. Not true on first render: a badge that
  // pulses every time the page opens says "this just changed" when nothing did.
  const statusChanged = useValueChanged(refund?.status);
  const { mutateAsync: deleteRefund, isPending: isDeleting } = useDeleteRefund();

  // `isDeleting` covers only the DELETE request; it falls the instant it
  // resolves. But a successful delete then calls navigate("/"), whose loader
  // still has to fetch Home's data — during that window this screen (and this
  // button) is still what's on the page. The router's navigation state closes
  // that gap.
  const navigation = useNavigation();
  const isBusy = isDeleting || navigation.state !== "idle";

  async function handleConfirmDelete() {
    if (!id) return;
    setDeleteError(null);
    try {
      await deleteRefund(id);
      setIsDeleteOpen(false);
      navigate("/");
    } catch (err) {
      setDeleteError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <Card>
        {isLoading && (
          <>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="mx-auto h-4 w-32" />
            </CardContent>
          </>
        )}

        {isError && !isLoading && (
          <CardContent>
            <p className="py-4 text-center text-sm text-destructive">
              Não foi possível encontrar essa solicitação.
            </p>
          </CardContent>
        )}

        {refund && !isLoading && (
          <>
            <CardHeader>
              <CardTitle>{refund.name}</CardTitle>
              <CardDescription>{t(CATEGORIES[refund.category].labelKey)}</CardDescription>
              <Badge
                variant={REFUND_STATUS[refund.status].variant}
                className={cn("w-fit", statusChanged && "badge-pop")}
              >
                {t(REFUND_STATUS[refund.status].labelKey)}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="refund-amount">{t("common.amount")}</Label>
                <Input
                  id="refund-amount"
                  readOnly
                  value={formatCentsToBRL(refund.amount_in_cents)}
                />
              </div>
              {id && <ReceiptPreview refundId={id} refundName={refund.name} kind="expense" />}
              {id && refund.status === "paid" && (
                <ReceiptPreview refundId={id} refundName={refund.name} kind="payment" />
              )}
              {id && <ReviewTimeline refundId={id} />}
            </CardContent>
            <CardFooter>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setIsDeleteOpen(true)}
              >
                Excluir
              </Button>
            </CardFooter>
          </>
        )}
      </Card>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("refund.delete")}</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir essa solicitação? Essa ação é irreversível.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("common.cancel")}</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isBusy} aria-busy={isBusy}>
              {isBusy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {isBusy ? t("refund.deleting") : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
