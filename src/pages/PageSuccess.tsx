import { useNavigate } from "react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PageSuccess() {
  const navigate = useNavigate();

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
      {/* Reabrir o modal direto daqui pede estado compartilhado entre páginas —
          fica pra quando entrarmos na sub-fase de contexts. Por enquanto, só
          volta pra Home. */}
      <Button onClick={() => navigate("/")}>Nova solicitação</Button>
    </div>
  );
}
