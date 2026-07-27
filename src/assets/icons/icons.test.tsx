import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ReceiptIcon from "./Receipt.svg?react";

describe("svgr icon assets", () => {
  // Icons must paint with currentColor (not a hardcoded black) so a `text-*`
  // color utility — and therefore the theme — drives them. Otherwise they stay
  // black and vanish in dark mode.
  it("uses currentColor for its path fill", () => {
    const { container, unmount } = render(<ReceiptIcon />);
    const path = container.querySelector("path");
    expect(path?.getAttribute("fill")).toBe("currentColor");
    unmount();
  });
});
