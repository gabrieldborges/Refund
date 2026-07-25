import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "./Button";

// Component-level tests: the Button in isolation, no router/query/network.
// They assert what a user perceives — an accessible button, its name, and
// whether a click happens — not the Tailwind classes it renders.

describe("Button", () => {
  // The children become the button's accessible name, and clicking runs onClick.
  it("renders an accessible button and fires onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Entrar</Button>);

    const button = screen.getByRole("button", { name: "Entrar" });
    await user.click(button);

    expect(onClick).toHaveBeenCalledOnce();
  });

  // A disabled button is exposed as disabled and swallows the click.
  it("does not fire onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Entrar
      </Button>
    );

    const button = screen.getByRole("button", { name: "Entrar" });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  // While handling, the button announces itself as busy (aria-busy), and its
  // accessible name stays "Entrar" because the spinner is decorative
  // (aria-hidden) and does not leak into the name.
  it("announces loading via aria-busy while handling", () => {
    render(<Button handling>Entrar</Button>);

    const button = screen.getByRole("button", { name: "Entrar" });
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  // With no handling, aria-busy is absent.
  it("is not busy by default", () => {
    render(<Button>Entrar</Button>);

    expect(screen.getByRole("button", { name: "Entrar" })).not.toHaveAttribute("aria-busy");
  });
});
