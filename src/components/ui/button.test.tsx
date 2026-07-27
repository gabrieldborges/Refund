import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  // The button must expose its label as the accessible name, so tests and
  // screen readers can find it by role + name.
  it("renders with an accessible name", () => {
    render(<Button>Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument();
  });

  // Clicking must call the handler — the default type is "button", so this
  // must not depend on being inside a form.
  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Enviar</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  // A disabled button must not fire its handler.
  it("does not call onClick when disabled", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Enviar</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  // asChild lets the button render as another element (a router Link, for
  // example) while keeping the button styling.
  it("renders as the child element when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/refunds">Ver solicitações</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Ver solicitações" })).toBeInTheDocument();
  });
});
