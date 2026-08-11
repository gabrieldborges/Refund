import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import UsersTable from "./UsersTable";
import type { TeamUser } from "../schemas/user";

const USERS: TeamUser[] = [
  {
    id: 1,
    name: "Ana",
    email: "ana@example.com",
    role: "standard",
    has_avatar: false,
    created_at: "2026-01-02T03:04:05",
  },
  {
    id: 2,
    name: "Chefe",
    email: "chefe@example.com",
    role: "admin",
    has_avatar: false,
    // Null on purpose: the column is nullable, and one row without a date must
    // not take the table down.
    created_at: null,
  },
];

function renderTable(users = USERS) {
  const router = createMemoryRouter([{ path: "/team", Component: () => <UsersTable users={users} /> }], {
    initialEntries: ["/team"],
  });
  return render(<RouterProvider router={router} />);
}

describe("UsersTable", () => {
  it("renders one row per user with name and email", () => {
    renderTable();

    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("Chefe")).toBeInTheDocument();
  });

  // The raw column value must never reach the screen: "admin" is a database
  // value, not a label a person should read.
  it("renders the role as a translated label", () => {
    renderTable();

    expect(screen.getByText("Administrador")).toBeInTheDocument();
    expect(screen.getByText("Padrão")).toBeInTheDocument();
    expect(screen.queryByText("admin")).toBeNull();
    expect(screen.queryByText("standard")).toBeNull();
  });

  it("falls back to a dash when created_at is null", () => {
    renderTable();

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("links each row to that person's page", () => {
    renderTable();

    expect(screen.getByRole("link", { name: "Ana" })).toHaveAttribute("href", "/team/1");
    expect(screen.getByRole("link", { name: "Chefe" })).toHaveAttribute("href", "/team/2");
  });

  // The API accepts no sort parameter, so a clickable header would either do
  // nothing or sort just the current page's rows — which is worse, because it
  // looks like it works.
  it("has no sortable headers", () => {
    renderTable();

    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(4);
    headers.forEach((header) => expect(header.querySelector("button")).toBeNull());
  });

  it("shows an empty message when there is nobody", () => {
    renderTable([]);

    expect(screen.getByText("Nenhum usuário encontrado.")).toBeInTheDocument();
  });
});
