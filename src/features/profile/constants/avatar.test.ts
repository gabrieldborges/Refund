import { describe, expect, it } from "vitest";
import { avatarRejectionKey, MAX_AVATAR_BYTES } from "./avatar";

function fakeFile(name: string, bytes = 10): File {
  return new File([new Uint8Array(bytes)], name, { type: "image/png" });
}

describe("avatarRejectionKey", () => {
  it("accepts the extensions the API accepts", () => {
    for (const name of ["foto.jpg", "foto.jpeg", "foto.png"]) {
      expect(avatarRejectionKey(fakeFile(name))).toBeNull();
    }
  });

  // Case matters because the check is on the extension, and a camera roll is full of
  // .JPG in capitals.
  it("accepts an uppercase extension", () => {
    expect(avatarRejectionKey(fakeFile("FOTO.JPG"))).toBeNull();
  });

  // PDF is deliberately absent from the list even though it is a valid receipt: it
  // cannot be shown as a profile picture. Same reasoning the API's validator records.
  it("rejects a pdf", () => {
    expect(avatarRejectionKey(fakeFile("comprovante.pdf"))).toBe("avatar.errorExtension");
  });

  it("rejects a file with no extension", () => {
    expect(avatarRejectionKey(fakeFile("foto"))).toBe("avatar.errorExtension");
  });

  // The ceiling mirrors the API's 4 MB. Checking client-side saves the upload, it does
  // not replace the server's check.
  it("rejects a file over the ceiling", () => {
    expect(avatarRejectionKey(fakeFile("foto.png", MAX_AVATAR_BYTES + 1))).toBe(
      "avatar.errorTooLarge"
    );
  });

  it("accepts a file exactly at the ceiling", () => {
    expect(avatarRejectionKey(fakeFile("foto.png", MAX_AVATAR_BYTES))).toBeNull();
  });

  // Extension is checked BEFORE size: a 5 MB pdf should be told it is the wrong type,
  // which is the fixable thing.
  it("reports the extension first for a file that fails both", () => {
    expect(avatarRejectionKey(fakeFile("grande.pdf", MAX_AVATAR_BYTES + 1))).toBe(
      "avatar.errorExtension"
    );
  });
});
