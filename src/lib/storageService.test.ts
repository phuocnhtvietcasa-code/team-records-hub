import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./storageService";

describe("storageService XOR+Base64", () => {
  it("round-trips Vietnamese text with the right key", () => {
    const c = encrypt('{"name":"Nguyễn Văn A"}', "bí mật");
    expect(c).not.toContain("Nguy");
    expect(decrypt(c, "bí mật")).toBe('{"name":"Nguyễn Văn A"}');
  });
  it("wrong key does not reveal the data", () => {
    const c = encrypt("doanh số 100", "abc");
    expect(decrypt(c, "xyz")).not.toBe("doanh số 100");
  });
});
