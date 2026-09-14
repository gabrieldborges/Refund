# Refund — Frontend

Web interface for Refund, a system to create, list and review refund requests.
The product requirements and shared decisions live in the
[canonical documentation](https://github.com/gabrieldborges/Refund-api/blob/main/docs/index.md)
of the API repository.

**Live:** https://independent-fascination-production-feea.up.railway.app/
**API repository:** https://github.com/gabrieldborges/Refund-api

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7, TanStack Query,
Axios, react-hook-form, Zod and Radix UI.

## Requirements

- Node.js and npm.
- The Refund API running at `http://localhost:3333`.
- Port `5173` available. The API's CORS is configured through the
  `CORS_ORIGINS` variable (see the `.env.example` in `Refund-api`); the example
  value allows `http://localhost:5173` and `http://localhost:4173`, so Vite must
  use one of those ports, or the variable must follow. An origin outside the
  list gets `400 Disallowed CORS origin`, which **looks** like a credential
  rejection and is not.

## Running locally

Create a local `.env` file at the project root:

```env
VITE_API_URL=http://localhost:3333
```

This file holds your local environment configuration. It is ignored by Git and
must not be committed.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Checks

```bash
npm run build
npm run lint
```

## Production

The frontend has been deployed since 2026-08-10, served as static files by
**Railway**, with the API from the sibling repository also on Railway. To know
whether it is up right now, rather than trusting this section:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://independent-fascination-production-feea.up.railway.app/
```

### The `start` script, and why the `-s`

```json
"start": "serve -s dist -l ${PORT:-4173}"
```

This is the command the platform runs after the build. Three details, each of
which prevents a real defect:

- **`-s` is the SPA history fallback**, and it is not optional. Without it,
  `serve` looks for a file named after the route: pressing F5 on
  `/refunds/79/review` answers **404**, because that path only exists inside
  React Router, never on disk. With `-s`, any route that is not a file returns
  `index.html` and the router takes over. Proved by deliberate breakage: same
  build, same route, **200 with `-s` and 404 without**.
- **`${PORT:-4173}`** because the platform picks the port and injects the
  variable; `4173` keeps the command working on your machine.
- **`serve` lives in `dependencies`, NOT in `devDependencies`.** It looks like
  a development tool and is not: it is the **production server**. Platforms
  prune development dependencies whenever `NODE_ENV=production`, so with the
  wrong placement the build passes and the start dies with `serve: not found`.
  That is exactly what happened on the first deployment attempt, and the
  service never came up. To re-verify:

  ```bash
  npm ci --omit=dev && npm ls serve --omit=dev && npx serve --version
  ```

### `VITE_API_URL` needs the scheme

The value **must be absolute**, with `https://`. Without the scheme, Axios
treats the `baseURL` as a **relative path** and sends every request to the
frontend's own origin, where `serve -s` answers **200 with `index.html`**. The
application receives HTML where it expects JSON and fails immediately, and the
symptom on screen reads as "login is broken" instead of "the configuration is
wrong". **Nothing in the code validates this today** (a pending item recorded
in the
[current state](https://github.com/gabrieldborges/Refund-api/blob/main/docs/plans/current-state.md)).

How to check which value is actually published, since Vite **bakes** the
`VITE_*` variables into the bundle at build time:

```bash
npm run build
grep -rho 'baseURL:[^,}]*' dist/assets/*.js
```

With a local `.env` this prints `baseURL:\`http://localhost:3333\``; in a
production build, the API domain. If it prints only a one-letter identifier
(`baseURL:o`), that is Axios's own internal instance, not ours: look for the
line that carries a string.

For the same reason, **changing the variable requires a rebuild**: changing it
in the dashboard and restarting the service changes nothing.
