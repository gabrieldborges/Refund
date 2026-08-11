# Refund — Frontend

Interface web do Refund, sistema para criar, listar e consultar solicitações
de reembolso. Os requisitos e as decisões compartilhadas do produto estão na
[documentação canônica](../Refund-api/docs/index.md).

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7, TanStack Query,
Axios, react-hook-form, Zod e Radix UI.

## Requisitos

- Node.js e npm.
- A API do Refund em execução em `http://localhost:3333`.
- A porta `5173` disponível. O CORS da API é configurável pela variável
  `CORS_ORIGINS` (ver o `.env.example` do `Refund-api`), e o valor de exemplo
  libera `http://localhost:5173` e `http://localhost:4173` — o Vite deve usar
  uma dessas portas, ou a variável precisa acompanhar. Uma origem fora da lista
  recebe `400 Disallowed CORS origin`, que **parece** rejeição de credencial e
  não é.

## Executar localmente

Crie um arquivo `.env` local na raiz do projeto:

```env
VITE_API_URL=http://localhost:3333
```

Esse arquivo contém a configuração do seu ambiente local, é ignorado pelo Git e
não deve ser versionado.

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

## Produção

O frontend está implantado desde 2026-08-10, servido estático pela **Railway**,
com a API no repositório irmão também na Railway. Para saber se está no ar
agora — e não pela existência desta seção:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://independent-fascination-production-feea.up.railway.app/
```

### O script `start`, e por que o `-s`

```json
"start": "serve -s dist -l ${PORT:-4173}"
```

Este é o comando que a plataforma roda depois do build. Três detalhes, e cada
um evita um defeito real:

- **`-s` é o fallback de history da SPA**, e não é opcional. Sem ele, o `serve`
  procura um arquivo com o nome da rota: um F5 em `/refunds/79/review` responde
  **404**, porque esse caminho só existe dentro do React Router, nunca no disco.
  Com `-s`, qualquer rota que não seja um arquivo devolve o `index.html` e o
  roteador assume dali. Provado por quebra deliberada: mesmo build, mesma rota,
  **200 com `-s` e 404 sem**.
- **`${PORT:-4173}`** porque a plataforma escolhe a porta e injeta a variável;
  o `4173` mantém o comando funcionando na sua máquina.
- **`serve` fica em `dependencies`, NÃO em `devDependencies`.** Ele parece
  ferramenta de desenvolvimento e não é: é o **servidor de produção**.
  Plataformas podam as dependências de desenvolvimento sempre que
  `NODE_ENV=production`, então com a colocação errada o build passa e o start
  morre com `serve: not found` — foi exatamente o que aconteceu na primeira
  tentativa de implantação, e o serviço nunca subiu. Se precisar reverificar:

  ```bash
  npm ci --omit=dev && npm ls serve --omit=dev && npx serve --version
  ```

### `VITE_API_URL` precisa do esquema

O valor **tem de ser absoluto**, com `https://`. Sem o esquema, o Axios trata a
`baseURL` como **caminho relativo** e manda toda requisição para a origem do
próprio frontend — onde o `serve -s` responde **200 com o `index.html`**. A
aplicação recebe HTML onde espera JSON e falha na hora, e o sintoma na tela lê-se
como "o login está quebrado" em vez de "a configuração está errada". **Nada no
código valida isso hoje** (é uma pendência registrada no
[estado atual](../Refund-api/docs/plans/current-state.md)).

Como conferir qual valor está de fato publicado, já que o Vite **assa** as
variáveis `VITE_*` no bundle em tempo de build:

```bash
npm run build
grep -rho 'baseURL:[^,}]*' dist/assets/*.js
```

Com um `.env` local isso imprime `baseURL:\`http://localhost:3333\``; num build
de produção, o domínio da API. Se imprimir só um identificador de uma letra
(`baseURL:o`), é a instância interna do próprio Axios, não a nossa — procure a
linha que traz uma string.

Pelo mesmo motivo, **trocar a variável exige um rebuild**: mudar no painel e
reiniciar o serviço não muda nada.
