import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";
import { USER_STORAGE_KEY } from "@/lib/api";
import { queryClient } from "@/lib/query-client";

// Reads the session out of the context so the assertions can be made on
// rendered text instead of on internal state.
function SessionProbe() {
  const { user, isAuthenticated, logout } = useAuth();
  return (
    <>
      <p>{isAuthenticated ? `logged:${user?.id}` : "anonymous"}</p>
      <button onClick={logout}>Sair</button>
    </>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <SessionProbe />
    </AuthProvider>
  );
}

describe("AuthProvider stored session", () => {
  // The blocked-storage test below stubs Storage.prototype; without this the
  // stub would leak into every test that runs after it in this file.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // A session persisted in the new shape is restored on boot.
  it("restores a valid stored session", () => {
    localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({ id: 7, name: "Ana", email: "ana@exemplo.com", role: "standard" })
    );

    renderProbe();

    expect(screen.getByText("logged:7")).toBeInTheDocument();
  });

  // A session persisted before `id` existed no longer satisfies the schema, so
  // the app must boot logged out rather than carrying a half-valid user.
  it("discards a stored session missing id", () => {
    localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({ name: "Ana", email: "ana@exemplo.com", role: "standard" })
    );

    renderProbe();

    expect(screen.getByText("anonymous")).toBeInTheDocument();
  });

  // Corrupted JSON must not throw during the initial render.
  it("discards a corrupted stored session", () => {
    localStorage.setItem(USER_STORAGE_KEY, "{not json");

    renderProbe();

    expect(screen.getByText("anonymous")).toBeInTheDocument();
  });

  // Reading localStorage is itself a throwing operation when the browser
  // blocks site data (privacy settings, enterprise policy). Because this read
  // runs inside a useState initializer, an uncaught throw happens during
  // render and unmounts the whole tree — a blank page. Booting anonymous is
  // the correct outcome: an unreadable session should drop the session, not
  // the application.
  it("boots anonymous when localStorage access itself throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });

    expect(() => renderProbe()).not.toThrow();
    expect(screen.getByText("anonymous")).toBeInTheDocument();
  });
});

describe("AuthProvider logout", () => {
  // queryClient is a module-level singleton reused across the whole app (and
  // across tests, since it is imported by module path, not provided fresh per
  // render like QueryWrapper does elsewhere). Leaving data seeded here would
  // leak into unrelated tests, so every entry this suite adds is cleared
  // afterwards regardless of whether the assertion below already emptied it.
  afterEach(() => {
    queryClient.clear();
  });

  // Regression test for the cache surviving logout: user A views a receipt
  // (or any cached data), logs out, user B logs in in the same tab — within
  // staleTime/gcTime the loaders and useReceipt would still serve A's data,
  // including the receipt Blob, unless logout empties the cache.
  it("empties the query cache", async () => {
    const user = userEvent.setup();
    queryClient.setQueryData(["probe", "session-a"], { secret: "A's data" });
    expect(queryClient.getQueryData(["probe", "session-a"])).toEqual({ secret: "A's data" });

    renderProbe();
    await user.click(screen.getByRole("button", { name: "Sair" }));

    expect(queryClient.getQueryData(["probe", "session-a"])).toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
