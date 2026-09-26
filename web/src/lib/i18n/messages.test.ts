// Message catalogue guard: every namespace exists in both locales with the same keys, no empty values, real Arabic.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES } from "./routing";
import { MESSAGE_NAMESPACES } from "./namespaces";

const MESSAGES_DIR = path.resolve(__dirname, "../../../messages");

/**
 * `<namespace>.<key.path>` whose Arabic value may legitimately contain no Arabic script (e.g. a Latin brand mark).
 * Values with no letters at all (pure ICU / numbers / punctuation) are always allowed.
 */
const LATIN_ONLY_ALLOWED = new Set<string>(["common.devUi.specimen.latin"]);

type Flat = Map<string, string>;

function flatten(value: unknown, prefix: string, out: Flat): Flat {
  if (typeof value === "string") out.set(prefix, value);
  else if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else out.set(prefix, `<<non-string ${JSON.stringify(value)}>>`);
  return out;
}

/** ICU argument names (`{count}`, `{count, plural, ...}`), skipping plural/select branch bodies. */
function icuArguments(message: string): string[] {
  const names = new Set<string>();
  const re = /(?<!(?:zero|one|two|few|many|other|=\d+)\s*)\{\s*([A-Za-z_][\w]*)\s*(?=[,}])/g;
  for (const m of message.matchAll(re)) names.add(m[1]!);
  return [...names].sort();
}

function namespaceFiles(locale: string): string[] {
  const dir = path.join(MESSAGES_DIR, locale);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

function load(locale: string, ns: string): Flat {
  const raw = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, locale, `${ns}.json`), "utf8"));
  return flatten(raw, "", new Map());
}

const ARABIC = /[؀-ۿ]/;
const LETTER = /[A-Za-z؀-ۿ]/;

describe("message catalogues", () => {
  it("icuArguments ignores plural branch bodies", () => {
    expect(icuArguments("{count, plural, one {# item} other {# items}} for {name}")).toEqual(["count", "name"]);
    expect(icuArguments("no args")).toEqual([]);
  });

  it("every namespace file exists in both locales or neither, and is a registered namespace", () => {
    const [first, ...rest] = LOCALES.map((l) => namespaceFiles(l));
    for (const other of rest) expect(other).toEqual(first);
    for (const ns of first!) expect(MESSAGE_NAMESPACES as readonly string[]).toContain(ns);
    expect(first).toContain("common");
  });

  for (const ns of namespaceFiles("ar")) {
    describe(`${ns}.json`, () => {
      const ar = load("ar", ns);
      const en = load("en", ns);

      it("has identical key sets in ar and en", () => {
        expect([...ar.keys()].sort()).toEqual([...en.keys()].sort());
      });

      it("has no empty or non-string values", () => {
        for (const [locale, flat] of [["ar", ar], ["en", en]] as const) {
          for (const [key, value] of flat) {
            expect(value.trim(), `${locale}:${ns}.${key}`).not.toBe("");
            expect(value, `${locale}:${ns}.${key}`).not.toMatch(/^<<non-string/);
          }
        }
      });

      it("Arabic values are written in Arabic", () => {
        const offenders = [...ar]
          .filter(([, value]) => LETTER.test(value.replace(/\{[^{}]*\}/g, "")) && !ARABIC.test(value))
          .filter(([key]) => !LATIN_ONLY_ALLOWED.has(`${ns}.${key}`))
          .map(([key, value]) => `${key}: ${value}`);
        expect(offenders).toEqual([]);
      });

      it("ICU placeholders match across locales", () => {
        for (const [key, value] of ar) {
          const other = en.get(key);
          if (other !== undefined) expect(icuArguments(value), `${ns}.${key}`).toEqual(icuArguments(other));
        }
      });
    });
  }
});
