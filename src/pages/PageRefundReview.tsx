import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CATEGORIES,
  PayRefundDialog,
  ReceiptPreview,
  REFUND_STATUS,
  RequesterPanel,
  ReviewDecision,
  ReviewTimeline,
  useNextPendingRefund,
  useRefund,
} from "@/features/refunds";
import { formatCentsToBRL } from "@/lib/format";
import { useAuth } from "@/context/useAuth";

// reviewLoader (router-loaders.ts) already guarantees only an admin reviewing
// someone else's refund reaches this component.
export default function PageRefundReview() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: refund, isLoading, isError } = useRefund(id);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const { nextRefund } = useNextPendingRefund(refund?.id ?? 0, user);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      {refund && (
      <div className="flex justify-end">
        {nextRefund ? (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/refunds/${nextRefund.id}/review`}>
              Próxima pendente
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Próxima pendente
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>
      )}

      <Card>
        {isLoading && (
          <>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Skeleton className="h-9 w-full" />
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
              <Badge variant={REFUND_STATUS[refund.status].variant} className="w-fit">
                {REFUND_STATUS[refund.status].label}
              </Badge>
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
              {/* O comprovante da despesa é o documento que a decisão julga,
                  então aparece sempre — a mesma ordem da página de detalhe. */}
              {id && <ReceiptPreview refundId={id} refundName={refund.name} kind="expense" />}
              {id && refund.status === "paid" && (
                <ReceiptPreview refundId={id} refundName={refund.name} kind="payment" />
              )}
              {id && <ReviewTimeline refundId={id} />}
            </CardContent>
            {id && (
              <CardFooter>
                <ReviewDecision
                  refundId={id}
                  status={refund.status}
                  onMarkAsPaid={() => setIsPayOpen(true)}
                />
              </CardFooter>
            )}
          </>
        )}
      </Card>

      {refund && !isLoading && (
        <RequesterPanel requester={refund.user} viewer={user} currentRefundId={refund.id} />
      )}

      {id && <PayRefundDialog refundId={id} open={isPayOpen} onOpenChange={setIsPayOpen} />}
    </div>
  );
}
