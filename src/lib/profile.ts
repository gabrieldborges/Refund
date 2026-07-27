// Uppercase initials: first letter of the first and last words, or the first
// two letters when there is a single word.
export function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Frontend-derived handle from the email local part (before "@").
export function usernameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  return `@${local}`;
}
