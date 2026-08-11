// Public API (façade) of the team feature. The rest of the app must import from
// "@/features/team", never from an internal path like
// "features/team/hooks/useUsers" — eslint-plugin-boundaries enforces it.
// Internal details (userKeys, the response schemas, USER_ROLE) are intentionally
// NOT re-exported.
//
// This feature must not import `features/refunds`: sibling features are
// forbidden. The team member page composes the two, because a page is the `app`
// layer and that is the only layer allowed to.

// Data-access layer: query options reused by the router loaders.
export { userListQuery, userDetailQuery } from "./api/userQueries";

// Hooks: the feature's data API for pages.
export { useUsers } from "./hooks/useUsers";
export { useUser } from "./hooks/useUser";

// URL search-params schema used by the team loader.
export { userListSearchParamsSchema } from "./schemas/user";
export type { TeamUser, UserRole } from "./schemas/user";

// Page size, shared by the hook and the loader so the two cannot drift.
export { USERS_PER_PAGE } from "./constants/pagination";

// A listagem do diretório como tabela. Sem ordenação: a API não a aceita.
export { default as UsersTable } from "./components/UsersTable";

// O rótulo e a variante de cada papel, para a página do membro montar o mesmo
// badge que a tabela — sem uma segunda cópia do mapa.
export { USER_ROLE } from "./constants/roles";
