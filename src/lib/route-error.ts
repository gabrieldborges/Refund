import { isRouteErrorResponse } from "react-router";

// Returns a catalogue KEY, not a message. Translating here would require a `t`
// bound to the active locale, and this is a plain module with no React
// context — both callers already have one, so the mapping stays pure and the
// translation happens where the language is known.
//
// Shared by the two route-level error UIs: the full-page PageRouteError and
// the compact ContentError rendered inside the app shell. Extracted only once
// the second consumer appeared, not in anticipation of it.
export function getRouteErrorMessageKey(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return "error.notFound";
    }

    if (error.status === 400) {
      return "error.badRequest";
    }
  }

  return "error.generic";
}
