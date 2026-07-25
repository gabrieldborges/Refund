import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Wraps children in a QueryClientProvider backed by a fresh client per render.
// Used as the `wrapper` for renderHook when testing data hooks in isolation.
// Retries are off so a mocked error response fails fast instead of being
// retried (which would slow tests and hide the first failure).
//
// This file exports only the component on purpose: the react-refresh lint rule
// forbids mixing a component with other exports in one file. If a bare
// QueryClient factory is needed elsewhere, add it in a separate .ts module.
export function QueryWrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
