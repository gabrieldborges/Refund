import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/context/useAuth";
import { RefundStatsPanel } from "@/features/refunds";
import { UserAvatar } from "@/features/profile";
import { USER_ROLE, useUser } from "@/features/team";

export default function PageTeamMember() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user: viewer } = useAuth();
  const { data: member, isLoading, isError } = useUser(id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-32 w-full max-w-lg" />
        <Skeleton className="h-64 w-full max-w-lg" />
      </div>
    );
  }

  // Erro antes de qualquer render de conteúdo: uma identidade em branco seria
  // indistinguível de um usuário sem dados.
  if (isError || !member) {
    return (
      <div className="p-4">
        <p role="alert" className="text-sm text-destructive">
          {t("team.memberLoadError")}
        </p>
      </div>
    );
  }

  const role = USER_ROLE[member.role];

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* O ÚNICO lugar onde o nome aparece como título. É por isso que o
          RefundStatsPanel não desenha cabeçalho: se desenhasse, o nome sairia
          duas vezes nesta página. */}
      <Card className="max-w-lg">
        <CardHeader>
          {/* CardTitle do registry é uma <div>, sem `asChild`: ela dá o estilo,
              não a semântica. O <h2> aninhado é o que faz o nome ser um heading
              de verdade — necessário porque o painel abaixo tem um <h3>
              ("Solicitações"), e um h3 sem nada acima dele deixa a página sem
              hierarquia para quem navega por headings. */}
          <CardTitle className="flex items-center gap-3">
            <UserAvatar
              userId={member.id}
              name={member.name}
              hasAvatar={member.has_avatar}
              className="size-12"
            />
            <h2>{member.name}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("team.columnEmail")}</span>
            <span>{member.email}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("team.columnRole")}</span>
            <Badge variant={role.variant}>{t(role.labelKey)}</Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("team.columnCreatedAt")}</span>
            <span>{formatDate(member.created_at)}</span>
          </div>
        </CardContent>
      </Card>

      {/* A composição de duas features acontece AQUI, na camada `app`: a feature
          `team` não pode importar `features/refunds`, e vice-versa. O viewer vem
          do contexto porque uma página pode lê-lo, ao contrário de um componente
          de feature. */}
      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <RefundStatsPanel
            userId={member.id}
            viewer={viewer}
          />
        </CardContent>
      </Card>
    </div>
  );
}
