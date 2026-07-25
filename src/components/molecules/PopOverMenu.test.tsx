import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PopOverMenu from "./PopOverMenu";

const options = [
  { label: "Alimentação", value: "food" },
  { label: "Transporte", value: "transport" },
];

describe("PopOverMenu", () => {
  // The trigger is exposed as a button and can be opened from the keyboard —
  // it is a <div>, so it needs role="button" and an explicit Enter/Space handler
  // (a native button would do this for free).
  it("exposes the trigger as a button and opens with the keyboard", async () => {
    const user = userEvent.setup();
    render(<PopOverMenu options={options} />);

    screen.getByRole("button").focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Transporte")).toBeInTheDocument();
  });

  // Selecting an option reports its value.
  it("reports the selected value on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PopOverMenu options={options} onChange={onChange} />);

    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByText("Transporte"));

    expect(onChange).toHaveBeenCalledWith("transport");
  });
});
