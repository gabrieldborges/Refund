# Perfil do desenvolvedor

Antes de decisões de arquitetura, nomenclatura ou estilo neste projeto, consulte
[CODING_PROFILE.md](../../CODING_PROFILE.md) — ele descreve meu stack, convenções,
nível por tecnologia, padrões recorrentes e como prefiro que a IA colabore comigo.

## O projeto

- Frontend do sistema de reembolso (Refund). Backend irmão em `../Refund-api`
  (FastAPI, `localhost:3333`; o CORS de lá só libera a origem `localhost:5173`,
  então este frontend precisa rodar na porta padrão do Vite).
- Design de referência: Figma "Sistema de reembolso" (Community), 5 telas:
  Home/lista com busca e paginação, Detalhes, modal de confirmação de exclusão,
  Nova solicitação (será modal sobre a Home, conforme spec original do desafio),
  e Sucesso. Além delas, Login/Cadastro serão criados seguindo o design system
  (não existem no Figma — autenticação foi adição nossa ao escopo).
- Stack atual: React 19 + TypeScript + Vite, Tailwind CSS 4 (tokens de cor e
  fonte em `src/index.css`), tailwind-variants, radix-ui, React Router 7.
  Axios/TanStack Query/react-hook-form/zod entram só na fase de API.
- Estrutura: Atomic Design — `src/components/{atoms,molecules,organisms,core}`,
  páginas em `src/pages` (prefixo `Page`). O design system já tem: Text, Icon,
  NavLink (atoms); Button, ButtonIcon, InputText, InputLabelWrapper, Dialog,
  PopOverMenu (molecules); Header (organisms); MainLayout (core).
- Categorias de reembolso (valores da API): `food/lodging/transport/service/others`
  — labels PT: Alimentação, Hospedagem, Transporte, Serviços, Outros. Ícones já
  existem em `src/assets/icons` (ForkKnife, Bed, PoliceCar, Wrench, DesktopTower).
- A API guarda valores como `amount_in_cents` (inteiro); exibição em reais é
  responsabilidade do frontend.

## Como trabalhar neste projeto (método combinado, 2026-07-14)

- **Desenvolvimento em sub-fases dentro da fase 1 (layout/navegação)**:
  1. **Layout com mock**: construir o layout de cada página com dados
     estáticos/fake (sem context, sem API), só pra validar visual e navegação
     entre telas.
  2. **Contexts**: só depois que as páginas com mock existirem, introduzir os
     contexts necessários (ex: estado do modal de nova solicitação, auth),
     de forma explicativa e por etapas — um context de cada vez.
  3. **API**: consumo real via axios/React Query, substituindo os mocks. É
     também aqui que entram `react-hook-form` + validação com **Zod** em cada
     formulário (Login, Cadastro, Nova solicitação) — não faz sentido validar
     antes de existir uma submissão de verdade pra rejeitar; as regras do
     schema espelham o que o backend já exige (categoria dentro do enum,
     arquivo JPG/PNG/PDF ≤ 4MB, senha com tamanho mínimo, valor > 0).
  4. **Decisão sobre testes**: ao final, decidir junto se e como testar (não
     é automático — pode ser que não valha a pena, dependendo do que sobrou).
  Sub-fase 1 concluída (2026-07-14): as 7 telas existem e navegam entre si
  com dados mock (Login, Cadastro, Home, Detalhes, Nova solicitação, exclusão,
  Sucesso). Estamos começando a sub-fase 2 (Contexts).
- **Um passo por vez**: propor a lista de etapas, implementar UMA etapa,
  mostrar o que mudou (problema → solução → implementação → o que mudou) e
  **esperar aprovação do Gabriel antes da próxima**. Não construir várias
  telas/contexts de uma vez.
- Perguntar antes de adicionar infra transversal (setup de testes, cliente
  HTTP, contexts globais, bibliotecas novas) — não embutir isso junto de uma
  feature sem avisar.
- Rodar `npx tsc -b --noEmit` depois de qualquer mudança.
- Textos de UI em português; código/identificadores em inglês.
- Se/quando testes voltarem (sub-fase 4): comentários de teste sempre
  descritivos e em inglês (mesma regra do backend).

## Referência útil

- O branch `backup/claude-session-2026-07-13` guarda uma primeira tentativa
  (revertida por ter ido rápido demais) com material reaproveitável: correções
  no design system (bug do `disabled` no ButtonIcon, overlay/estilo do Dialog,
  PopOverMenu controlável por props), páginas de auth, hooks de API e setup de
  testes. Consultar como referência quando cada etapa chegar — não restaurar
  em bloco.
