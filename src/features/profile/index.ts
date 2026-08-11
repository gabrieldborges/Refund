// Public API (façade) of the profile feature. The rest of the app imports from
// "@/features/profile", never an internal path — eslint-plugin-boundaries enforces it.
//
// Why a feature of its own, and not part of `team`: the avatar has its own endpoints,
// its own cache branch and its own mutations, and it is read by three screens that have
// nothing else in common — the shell's sidebar, the team directory and the team member
// page. `team` is the admin directory; the sidebar showing YOUR OWN picture is not that.
export { avatarUrlQuery } from "./api/avatarQueries";
export { useAvatarUrl } from "./hooks/useAvatarUrl";
export { useUploadAvatar } from "./hooks/useUploadAvatar";
export { useRemoveAvatar } from "./hooks/useRemoveAvatar";

// Limites espelhados do backend, para a recusa acontecer antes da viagem.
export { MAX_AVATAR_BYTES, AVATAR_ACCEPT, avatarRejectionKey } from "./constants/avatar";

export { default as UserAvatar } from "./components/UserAvatar";
export { default as AvatarUploadDialog } from "./components/AvatarUploadDialog";
