import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// The MSW request-interception server for tests. Its lifecycle
// (listen / resetHandlers / close) is wired in src/test/setup.ts.
export const server = setupServer(...handlers);
