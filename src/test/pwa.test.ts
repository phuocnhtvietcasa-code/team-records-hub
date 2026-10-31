import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicFile = (name: string) => readFileSync(`${process.cwd()}/public/${name}`);
const manifest = JSON.parse(publicFile("manifest.json").toString());

describe("Home-screen configuration", () => {
  it("launches the app independently within its own scope", () => {
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.id).toBe("/");
  });

  it.each([[192, "logo192.png"], [512, "logo512.png"], [180, "apple-touch-icon.png"]] as const)(
    "provides a square %i pixel home-screen icon",
    (size, file) => {
      const image = publicFile(file);
      expect(image.subarray(1, 4).toString()).toBe("PNG");
      expect(image.readUInt32BE(16)).toBe(size);
      expect(image.readUInt32BE(20)).toBe(size);
    },
  );

  it("provides both standard and safely masked Android icons", () => {
    expect(manifest.icons).toContainEqual({ src: "/logo192.png", sizes: "192x192", type: "image/png", purpose: "any" });
    expect(manifest.icons).toContainEqual({ src: "/logo512.png", sizes: "512x512", type: "image/png", purpose: "maskable" });
  });
});