import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initialsFromName } from "@/lib/profile";
import { useAvatarUrl } from "../hooks/useAvatarUrl";

interface UserAvatarProps {
  userId: number | undefined;
  name: string;
  // Vem do payload (`user.has_avatar` na solicitação, `has_avatar` no usuário do
  // diretório). `false` evita a requisição; `undefined` significa "não sei", e aí a
  // única forma de descobrir é perguntar — ver useAvatarUrl.
  hasAvatar?: boolean;
  className?: string;
}

// A foto de alguém, com as iniciais como fallback.
//
// As iniciais NÃO são um estado de erro: elas são o que a aplicação mostrou desde
// sempre, e continuam sendo a resposta certa para quem não tem foto, para quem tem e
// a URL falhou, e para enquanto a URL está sendo buscada. Por isso não há `isError`
// aqui — o AvatarFallback do Radix já cobre os três casos com o mesmo desenho.
export default function UserAvatar({ userId, name, hasAvatar, className }: UserAvatarProps) {
  const { data } = useAvatarUrl(userId, hasAvatar);

  return (
    <Avatar className={cn("size-9", className)}>
      {/* `src` só quando há URL: o AvatarImage do Radix com src vazio dispara o
          fallback de qualquer forma, mas passar undefined evita uma requisição para
          a página atual que o navegador registra como erro no console. */}
      {data?.url && <AvatarImage src={data.url} alt={name} />}
      <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
        {initialsFromName(name)}
      </AvatarFallback>
    </Avatar>
  );
}
