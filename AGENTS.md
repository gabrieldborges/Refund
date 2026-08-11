# Fonte da verdade

Antes de trabalhar neste frontend, leia a
[documentação canônica do Refund](../Refund-api/docs/index.md). Requisitos,
regras de negócio, casos de uso, modelo de domínio e decisões compartilhadas
devem ser alterados lá, sem serem duplicados neste arquivo.

# Perfil do desenvolvedor

Antes de decisões de arquitetura, nomenclatura ou estilo neste projeto, consulte
[CODING_PROFILE.md](../../CODING_PROFILE.md) — ele descreve meu stack, convenções,
nível por tecnologia, padrões recorrentes e como prefiro que a IA colabore comigo.

## O projeto

- Frontend do sistema de reembolso Refund. A API fica no repositório irmão
  `../Refund-api` e, durante o desenvolvimento, roda em `localhost:3333`.
- Stack atual: React 19, TypeScript, Vite, Tailwind CSS 4, class-variance-authority,
  Radix UI, React Router 7, Axios, TanStack Query, react-hook-form e Zod.
- Design system em `src/components/ui` (shadcn/ui, código copiado do registry e
  versionado aqui); `src/components/core` guarda a composição do shell. As
  páginas ficam em `src/pages` e usam o prefixo `Page`.
- Tokens de cor e tipografia ficam em `src/index.css`.
- Textos de UI devem ser escritos em português; código e identificadores, em
  inglês.

## Como trabalhar neste projeto

- Quando o trabalho fizer parte do Learning Path, leia e siga o
  [fluxo permanente da trilha](../Refund-api/docs/plans/learning-path-workflow.md)
  antes de propor ou implementar o item.
- Trabalhe de forma incremental: proponha as etapas, implemente uma etapa por
  vez e explique brevemente o problema, a solução, a implementação e o que
  mudou. Espere a aprovação do Gabriel antes de avançar para a próxima etapa.
- Prefira soluções simples, nomes claros e código legível. Não crie abstrações
  prematuras.
- Explique e alinhe antes de introduzir infraestrutura transversal, como setup
  de testes, clientes HTTP, contexts globais ou bibliotecas novas.
- Componentes novos do design system vêm do registry (`npx shadcn@latest add
  <componente>`) e ficam em `src/components/ui`. Só escreva um componente de
  UI à mão quando o registry não tiver equivalente.
- Rode `npm run typecheck` depois de qualquer mudança (é o `tsc -b --noEmit`,
  agora com script próprio).
- As quatro verificações — `typecheck`, `lint`, `test`, `build` — rodam no CI
  (`.github/workflows/ci.yml`) a cada push, na mesma ordem, do mais barato ao
  mais caro. **O CI é a fonte da verdade**: ele parte de um runner vazio e
  instala com `npm ci`, então não herda nada da sua máquina.
- Se forem adicionados testes, escreva os comentários descritivos em inglês.
- Consulte a documentação canônica em vez de inferir ou repetir regras
  funcionais neste repositório.

## Responsividade

A referência usada na auditoria foi o iPhone 12 Pro (390 × 844). Meça overflow
real comparando `scrollWidth` e `clientWidth`; uma captura de tela isolada pode
ocultar o problema.

Lições que devem ser preservadas:

- **`Topbar`**: use `truncate` no título e agrupe as ações à direita com
  `ml-auto` para impedir sobreposição em telas estreitas, sem precisar quebrar
  linha.
- **`Button`** (shadcn): não tem largura padrão `w-full` nem variante `fit` —
  o componente do registry sempre acompanha o conteúdo. Quando um botão
  precisa ocupar a largura total, isso é decidido pelo chamador via
  `className="w-full"`, não pelo componente.
- **`Input`** (shadcn): preserve `min-w-0` na classe base (`ui/input.tsx:11`).
  Inputs nativos têm largura mínima do navegador e, sem `min-w-0` em algum
  ponto da cadeia flex, campos lado a lado podem causar overflow mesmo com
  `w-full`.

- **`Avatar` / `AvatarImage`** (shadcn): o snippet do registry traz só
  `aspect-square size-full` no `AvatarImage`, **sem `object-fit`** — e o padrão do
  `<img>` é `fill`, que ESTICA. Uma foto 4:3 chega deformada. Foi acrescentado
  `object-cover`, que escala até cobrir o quadrado e recorta o excesso, preservando a
  proporção. **Se este componente for readicionado pelo registry, o desvio se perde**;
  não há teste que o proteja, porque o `AvatarImage` do Radix só monta depois que a
  imagem carrega e o jsdom nunca carrega imagem.

- **`InputFile`**: os padrões de `label` ("Comprovante") e `placeholder`
  ("Nome do arquivo.pdf") são do fluxo de comprovante. Qualquer outro uso precisa
  passar os dois — o diálogo de foto de perfil herdou os dois por engano, e o
  placeholder anunciava justamente o formato que um avatar não aceita.

Ao encontrar conteúdo cortado ou sobreposto em telas estreitas, verifique
primeiro se um input ou outro elemento flexível mantém uma largura mínima do
navegador em algum ponto da cadeia de flex.
