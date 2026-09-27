// NFR-LOC-001: no user-facing string literals in JSX. Copy comes from next-intl messages (ar + en).
import path from "node:path";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { findJsxLiterals, isTsx, listFiles } from "./guard-scan";

const ROOT = path.resolve(__dirname, "../../..");

/**
 * Dev-only QA tools (platform contracts lane, CI-004): English-only by decision (DECISIONS.md, platform merge PLM-04).
 * They 404 in production and are never shown to shoppers or staff. `/dev/ui` is NOT listed: it stays translated.
 */
const DEV_ONLY_ENGLISH = [
  "src/app/[locale]/dev/devtools.tsx",
  "src/app/[locale]/dev/outbox/",
  "src/app/[locale]/dev/services/",
];

function scannedFiles(): string[] {
  return [
    ...listFiles(ROOT, "src/app", isTsx),
    ...listFiles(ROOT, "src/components", isTsx),
    ...listFiles(ROOT, "src/modules", isTsx).filter((f) => f.includes("/ui/")),
  ].filter((f) => !DEV_ONLY_ENGLISH.some((p) => f.startsWith(p)));
}

describe("no JSX string literals (NFR-LOC-001)", () => {
  it("scanner catches text, labelled attributes and honours the escape hatch", () => {
    const src = [
      "export function A(): JSX.Element {",
      "  const x: Promise<Array<string>> = load();",
      "  return (",
      "    <div title=\"Hello\">",
      "      Add to cart",
      "      <input placeholder={'Search'} aria-label={t('x')} />",
      "      {/* i18n-ignore */}",
      "      DardaChat",
      "      <span>{t('ok')} · 42</span>",
      "    </div>",
      "  );",
      "}",
    ].join("\n");
    const found = findJsxLiterals("x.tsx", src).map((f) => f.text);
    expect(found).toEqual(['title="Hello"', "Add to cart", 'placeholder="Search"']);
  });

  it("app, components and module UI contain no literals", () => {
    const findings = scannedFiles().flatMap((file) =>
      findJsxLiterals(file, fs.readFileSync(path.join(ROOT, file), "utf8")),
    );
    expect(findings.map((f) => `${f.file}:${f.line} ${f.text}`)).toEqual([]);
  });
});
