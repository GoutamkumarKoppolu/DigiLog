import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Android's resource parser rejects XML that browsers and editors accept, and
// it only runs in the Android CI build. Catch the easy mistakes here first.
const ROOT = fileURLToPath(new URL("../android/app/src/main/", import.meta.url));

function xmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "build" || name === "assets" ? [] : xmlFiles(path);
    return name.endsWith(".xml") ? [path] : [];
  });
}

describe("Android XML resources", () => {
  const files = xmlFiles(ROOT);

  it("finds the resource files", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it('has no "--" inside comments (XML forbids it; the build fails)', () => {
    const bad = files.filter((f) =>
      [...readFileSync(f, "utf8").matchAll(/<!--([\s\S]*?)-->/g)].some((m) => m[1].includes("--"))
    );
    expect(bad).toEqual([]);
  });
});
