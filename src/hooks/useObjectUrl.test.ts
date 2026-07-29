import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useObjectUrl } from "./useObjectUrl";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useObjectUrl", () => {
  // Without a blob there is nothing to point at, and null is distinguishable
  // from a real URL by the caller.
  it("returns null when there is no blob", () => {
    const { result } = renderHook(() => useObjectUrl(undefined));

    expect(result.current).toBeNull();
  });

  // The happy path: a blob produces a URL built from that exact blob.
  it("creates an object URL for the blob", () => {
    const createSpy = vi.spyOn(URL, "createObjectURL");
    const blob = new Blob(["x"], { type: "image/png" });

    const { result } = renderHook(() => useObjectUrl(blob));

    expect(result.current).toMatch(/^blob:/);
    expect(createSpy).toHaveBeenCalledWith(blob);
  });

  // The reason this hook exists: an object URL is a resource that leaks unless
  // it is revoked. Unmounting must release the exact URL that was handed out.
  it("revokes the URL on unmount", () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    const blob = new Blob(["x"], { type: "image/png" });

    const { result, unmount } = renderHook(() => useObjectUrl(blob));
    const created = result.current;
    unmount();

    expect(revokeSpy).toHaveBeenCalledWith(created);
  });

  // Replacing the blob must release the previous URL, not just the last one at
  // unmount — otherwise every swap leaks one URL.
  it("revokes the previous URL when the blob changes", () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    const first = new Blob(["a"], { type: "image/png" });
    const second = new Blob(["b"], { type: "image/png" });

    const { result, rerender } = renderHook(({ blob }) => useObjectUrl(blob), {
      initialProps: { blob: first },
    });
    const firstUrl = result.current;
    rerender({ blob: second });

    expect(revokeSpy).toHaveBeenCalledWith(firstUrl);
    expect(result.current).not.toBe(firstUrl);
  });
});
