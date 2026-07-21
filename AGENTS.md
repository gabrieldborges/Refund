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
- Stack atual: React 19, TypeScript, Vite, Tailwind CSS 4, tailwind-variants,
  Radix UI, React Router 7, Axios, TanStack Query, react-hook-form e Zod.
- Estrutura baseada em Atomic Design:
  `src/components/{atoms,molecules,organisms,core}`. As páginas ficam em
  `src/pages` e usam o prefixo `Page`.
- Tokens de cor e tipografia ficam em `src/index.css`.
- Textos de UI devem ser escritos em português; código e identificadores, em
  inglês.

## Como trabalhar neste projeto

- Trabalhe de forma incremental: proponha as etapas, implemente uma etapa por
  vez e explique brevemente o problema, a solução, a implementação e o que
  mudou. Espere a aprovação do Gabriel antes de avançar para a próxima etapa.
- Prefira soluções simples, nomes claros e código legível. Não crie abstrações
  prematuras.
- Explique e alinhe antes de introduzir infraestrutura transversal, como setup
  de testes, clientes HTTP, contexts globais ou bibliotecas novas.
- Preserve a organização em Atomic Design ao criar ou mover componentes.
- Rode `npx tsc -b --noEmit` depois de qualquer mudança.
- Se forem adicionados testes, escreva os comentários descritivos em inglês.
- Consulte a documentação canônica em vez de inferir ou repetir regras
  funcionais neste repositório.

## Responsividade

A referência usada na auditoria foi o iPhone 12 Pro (390 × 844). Meça overflow
real comparando `scrollWidth` e `clientWidth`; uma captura de tela isolada pode
ocultar o problema.

Lições que devem ser preservadas:

- **`Header`**: use `flex-wrap` para impedir sobreposição em telas estreitas. O
  link "Solicitações de reembolso" fica oculto abaixo de `sm:` por ser
  redundante com o título da página.
- **`Button`**: o tamanho padrão deve usar `w-full`, e não largura fixa. A
  variante `fit` continua reservada aos casos em que a largura acompanha o
  conteúdo.
- **`InputText`**: aplique a prop `className` e preserve `min-w-0`. Inputs
  nativos têm largura mínima do navegador e, sem `min-w-0` na cadeia flex,
  campos lado a lado podem causar overflow mesmo com `w-full`.

Ao encontrar conteúdo cortado ou sobreposto em telas estreitas, verifique
primeiro se um input ou outro elemento flexível mantém uma largura mínima do
navegador em algum ponto da cadeia de flex.
