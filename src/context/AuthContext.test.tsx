import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";
import { USER_STORAGE_KEY } from "@/lib/api";

// Reads the session out of the context so the assertions can be made on
// rendered text instead of on internal state.
function SessionProbe() {
  const { user, isAuthenticated } = useAuth();
  return <p>{isAuthenticated ? `logged:${user?.id}` : "anonymous"}</p>;
}

function renderProbe() {
  return render(
    <AuthProvider>
      <SessionProbe />
    </AuthProvider>
  );
}

describe("AuthProvider stored session", () => {
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
});
