import { useState } from "react";
import { useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CATEGORIES,
  PayRefundDialog,
  ReceiptPreview,
  REFUND_STATUS,
  ReviewDecision,
  ReviewTimeline,
  useRefund,
} from "@/features/refunds";
import { formatCentsToBRL } from "@/lib/format";

// reviewLoader (router-loaders.ts) already guarantees only an admin reviewing
// someone else's refund reaches this component.
export default function PageRefundReview() {
  const { id } = useParams();
  const { data: refund, isLoading, isError } = useRefund(id);
  const [isPayOpen, setIsPayOpen] = useState(false);

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

      {id && <PayRefundDialog refundId={id} open={isPayOpen} onOpenChange={setIsPayOpen} />}
    </div>
  );
}
