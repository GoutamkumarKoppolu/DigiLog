// Guards for UI rules that are easy to break and only show up on a phone.
// See "No browser suggestions" in CLAUDE.md.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = dirname(fileURLToPath(import.meta.url));

function jsxFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return jsxFiles(path);
    return name.endsWith(".jsx") ? [path] : [];
  });
}

// Comments may mention the things being checked for, so they're removed first.
const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const files = jsxFiles(SRC).map((path) => ({
  name: relative(SRC, path).replace(/\\/g, "/"),
  text: withoutComments(readFileSync(path, "utf8")),
}));

// Every "<tag ...>" opening tag in the file, with its attributes.
const tags = (text, tag) => [...text.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "g"))].map((m) => m[0]);

describe("no browser suggestions in the keyboard strip", () => {
  it("never uses <datalist> or list= (Android shows them above the keyboard)", () => {
    const offenders = files.filter((f) => /<datalist\b/.test(f.text) || tags(f.text, "input").some((t) => /\slist=/.test(t)));
    expect(offenders.map((f) => f.name)).toEqual([]);
  });

  it('turns autofill off on every <form> (autoComplete="off")', () => {
    const offenders = files.flatMap((f) => tags(f.text, "form").filter((t) => !/autoComplete="off"/.test(t)).map(() => f.name));
    expect(offenders).toEqual([]);
  });

  it("turns autofill off on inputs outside forms (search boxes)", () => {
    const offenders = files.flatMap((f) =>
      tags(f.text, "input")
        .filter((t) => /type="search"/.test(t) && !/autoComplete="off"/.test(t))
        .map(() => f.name)
    );
    expect(offenders).toEqual([]);
  });
});
