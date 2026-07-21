# Refund — Frontend

Interface web do Refund, sistema para criar, consultar e acompanhar solicitações
de reembolso. Os requisitos e as decisões compartilhadas do produto estão na
[documentação canônica](../Refund-api/docs/index.md).

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7, TanStack Query,
Axios, react-hook-form, Zod e Radix UI.

## Requisitos

- Node.js e npm.
- A API do Refund em execução em `http://localhost:3333`.
- A porta `5173` disponível. O CORS atual da API aceita o frontend em
  `http://localhost:5173`, portanto o Vite deve usar esse endereço.

## Executar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`.

## Verificações

```bash
npm run build
npm run lint
```
