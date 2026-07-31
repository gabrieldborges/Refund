import { useNavigate, useOutletContext } from "react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MainLayoutOutletContext } from "@/components/core/MainLayout";

export default function PageSuccess() {
  const navigate = useNavigate();
  const { openNewRefund } = useOutletContext<MainLayoutOutletContext>();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 p-6 text-center">
      <span className="flex size-20 items-center justify-center rounded-full border-4 border-primary">
        <Check className="size-10 text-primary" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">Solicitação enviada!</h1>
      <p className="text-sm text-muted-foreground">
        Agora é apenas aguardar! Sua solicitação será analisada e, em breve, o setor
        financeiro irá entrar em contato com você.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={openNewRefund}>Nova solicitação</Button>
        <Button variant="outline" onClick={() => navigate("/")}>
          Voltar para a Home
        </Button>
      </div>
    </div>
  );
}
