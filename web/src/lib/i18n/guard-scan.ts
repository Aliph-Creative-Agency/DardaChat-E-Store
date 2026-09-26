/**
 * Source scanners behind the i18n/RTL guard tests (NFR-LOC-001, NFR-LOC-002). Test-only helpers; they parse TSX with
 * the TypeScript compiler so generics like `Promise<Metadata>` are never mistaken for JSX text.
 * Escape hatch: put `i18n-ignore` in a comment on the offending line or the line above it.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

export type Finding = { file: string; line: number; text: string };

export const IGNORE_MARK = "i18n-ignore";

const LETTER = /[A-Za-z؀-ۿ]/;
const TEXT_ATTRIBUTES = new Set(["aria-label", "title", "placeholder", "alt", "aria-description", "aria-placeholder"]);

function parse(fileName: string, source: string) {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function isIgnored(lines: string[], line: number): boolean {
  return (lines[line] ?? "").includes(IGNORE_MARK) || (lines[line - 1] ?? "").includes(IGNORE_MARK);
}

function lineOf(sf: ts.SourceFile, node: ts.Node): number {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;
}

/** JSX text and user-visible string attributes that contain letters (must come from next-intl messages). */
export function findJsxLiterals(fileName: string, source: string): Finding[] {
  const sf = parse(fileName, source);
  const lines = source.split(/\r?\n/);
  const out: Finding[] = [];
  const report = (node: ts.Node, text: string) => {
    const line = lineOf(sf, node);
    if (!isIgnored(lines, line)) out.push({ file: fileName, line: line + 1, text: text.trim() });
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node) && LETTER.test(node.text)) report(node, node.text);
    if (ts.isJsxAttribute(node) && TEXT_ATTRIBUTES.has(node.name.getText(sf))) {
      const init = node.initializer;
      const literal =
        init && ts.isStringLiteral(init)
          ? init
          : init && ts.isJsxExpression(init) && init.expression && ts.isStringLiteralLike(init.expression)
            ? init.expression
            : undefined;
      if (literal && LETTER.test(literal.text)) report(node, `${node.name.getText(sf)}="${literal.text}"`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

const PHYSICAL_CLASS = [
  /^-?(ml|mr|pl|pr|left|right|scroll-ml|scroll-mr|scroll-pl|scroll-pr)-/,
  /^text-(left|right)$/,
  /^rounded-(l|r|tl|tr|bl|br)(-|$)/,
  /^border-(l|r)(-|$)/,
  /^float-(left|right)$/,
  /^clear-(left|right)$/,
  /^space-x-reverse$/,
];

/** Class tokens with a physical direction (use ms/me/ps/pe/start/end/text-start/rounded-s … instead). */
export function physicalClasses(value: string): string[] {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => {
      const bare = token.split(":").pop()!.replace(/^!/, "");
      return PHYSICAL_CLASS.some((re) => re.test(bare));
    });
}

/** Every string/template literal in the file is checked, so classes inside `cn(...)` or variant maps count too. */
export function findPhysicalClasses(fileName: string, source: string): Finding[] {
  const sf = parse(fileName, source);
  const lines = source.split(/\r?\n/);
  const out: Finding[] = [];
  const visit = (node: ts.Node) => {
    let text: string | undefined;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) text = node.text;
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) text = node.text;
    if (text) {
      const bad = physicalClasses(text);
      const line = lineOf(sf, node);
      if (bad.length && !isIgnored(lines, line)) out.push({ file: fileName, line: line + 1, text: bad.join(" ") });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** Recursively list files under `dir` (relative to `root`) whose name passes `accept`. Missing dirs yield []. */
export function listFiles(root: string, dir: string, accept: (name: string) => boolean): string[] {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(root, rel, accept));
    else if (accept(entry.name)) out.push(rel.split(path.sep).join("/"));
  }
  return out;
}

export const isTsx = (name: string) => name.endsWith(".tsx") && !name.endsWith(".test.tsx");
