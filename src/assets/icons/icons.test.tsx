import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ForkKnifeIcon from "./ForkKnife.svg?react";
import ReceiptIcon from "./Receipt.svg?react";

describe("svgr icon assets", () => {
  // Icons must paint with currentColor (not a hardcoded black) so a `text-*`
  // color utility — and therefore the theme — drives them. Otherwise they stay
  // black and vanish in dark mode.
  it("use currentColor for their path fill", () => {
    for (const Svg of [ForkKnifeIcon, ReceiptIcon]) {
      const { container, unmount } = render(<Svg />);
      const path = container.querySelector("path");
      expect(path?.getAttribute("fill")).toBe("currentColor");
      unmount();
    }
  });
});
