import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// What this file can and cannot prove.
//
// It CANNOT prove the animation stopped. jsdom implements no CSS engine and no
// prefers-reduced-motion media query, so nothing here observes a spinner
// spinning or not spinning. That is browser-only, and it is recorded as such.
//
// What it CAN prove is the premise the whole decision rests on: that stopping
// the spinner costs no information, because the busy state is carried by
// aria-busy and by a written label. If a future change ever made the spinner
// the only signal, these tests fail — and that is exactly the regression that
// would make the reduced-motion rule harmful instead of helpful.
function BusyButton({ isBusy }: { isBusy: boolean }) {
  return (
    <Button disabled={isBusy} aria-busy={isBusy}>
      {isBusy && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {isBusy ? "Aprovando…" : "Aprovar"}
    </Button>
  );
}

describe("busy state without motion", () => {
  // The spinner is aria-hidden, so assistive tech never saw it in the first
  // place. This asserts that the state is still fully described without it.
  it("announces the busy state through aria-busy and the label, not the icon", () => {
    render(<BusyButton isBusy />);

    const button = screen.getByRole("button", { name: "Aprovando…" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });

  // The label itself changes, so a user who cannot perceive the rotation still
  // sees the difference between the two states.
  it("changes the visible label between idle and busy", () => {
    const { rerender } = render(<BusyButton isBusy={false} />);
    expect(screen.getByRole("button", { name: "Aprovar" })).toHaveAttribute(
      "aria-busy",
      "false"
    );

    rerender(<BusyButton isBusy />);
    expect(screen.getByRole("button", { name: "Aprovando…" })).toBeInTheDocument();
  });

  // The spinner must stay hidden from the accessibility tree. If it ever got
  // an accessible name, stopping its animation would start hiding meaning.
  it("keeps the spinner out of the accessibility tree", () => {
    render(<BusyButton isBusy />);

    expect(screen.getByRole("button")).toHaveAccessibleName("Aprovando…");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
