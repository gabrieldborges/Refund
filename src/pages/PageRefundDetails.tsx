import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Receipt } from "lucide-react";
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
import { CATEGORIES, useDeleteRefund, useRefund } from "@/features/refunds";
import { getApiErrorMessage, getReceiptUrl } from "@/lib/api";
import { formatCentsToBRL } from "@/lib/format";

export default function PageRefundDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: refund, isLoading, isError } = useRefund(id);
  const { mutateAsync: deleteRefund, isPending: isDeleting } = useDeleteRefund();

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
              <CardDescription>{CATEGORIES[refund.category].label}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="refund-amount">Valor</Label>
                <Input
                  id="refund-amount"
                  readOnly
                  value={formatCentsToBRL(refund.amount_in_cents)}
                />
              </div>

              <a
                href={getReceiptUrl(refund.filename)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Receipt className="size-5" aria-hidden />
                Abrir comprovante
              </a>
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
            <DialogTitle>Excluir solicitação</DialogTitle>
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
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? "Excluindo…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
