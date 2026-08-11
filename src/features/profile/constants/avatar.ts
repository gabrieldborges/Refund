// Espelha o avatar_upload_validator do backend, para a recusa acontecer antes do
// upload em vez de depois. Duas listas, e é intencional: o cliente evita a viagem, o
// servidor é quem decide — quem checa só no cliente não checa.
//
// PDF está deliberadamente fora, embora seja comprovante válido: não dá para mostrar
// como foto de perfil. Mesma razão registrada no validator.
export const ALLOWED_AVATAR_EXTENSIONS = [".jpg", ".jpeg", ".png"] as const;

// O `accept` do input é dica para o seletor de arquivos do sistema, não validação:
// dá para arrastar qualquer coisa para dentro. Por isso a extensão é checada também.
export const AVATAR_ACCEPT = "image/jpeg,image/png";

// 4 MB, o mesmo teto de max_file_size_bytes.
export const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

export function avatarRejectionKey(file: File): string | null {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

  if (!ALLOWED_AVATAR_EXTENSIONS.includes(extension as (typeof ALLOWED_AVATAR_EXTENSIONS)[number])) {
    return "avatar.errorExtension";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "avatar.errorTooLarge";
  }
  return null;
}
