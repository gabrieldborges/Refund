import { useParams } from "react-router";

// Minimal shell: the reviewLoader already guarantees only an admin reviewing
// someone else's refund reaches this component. The review form itself is
// built in a later task.
export default function PageRefundReview() {
  const { id } = useParams();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Revisar solicitação #{id}</h1>
    </div>
  );
}
