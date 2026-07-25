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

  // While handling, a spinner is shown. Note: the spinner has no accessible
  // role/name yet (an Item 7 gap), so we detect it by its spin animation class;
  // and the pointer-events block that stops the click is CSS-only, so jsdom
  // (which loads no CSS) can't observe it — hence we don't assert on the click.
  it("shows a spinner while handling", () => {
    const { container } = render(<Button handling>Entrar</Button>);

    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });
});
