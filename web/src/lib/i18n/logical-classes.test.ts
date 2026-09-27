// NFR-LOC-002: layouts mirror in RTL, so Tailwind classes must use logical properties (ms/me/ps/pe/start/end).
import path from "node:path";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { findPhysicalClasses, isTsx, listFiles, physicalClasses } from "./guard-scan";

const ROOT = path.resolve(__dirname, "../../..");

describe("logical direction classes only (NFR-LOC-002)", () => {
  it("flags physical classes, including behind variants", () => {
    expect(
      physicalClasses(
        "ml-2 md:pr-4 -left-1 hover:text-right rounded-l-lg rounded-tr border-l float-left space-x-reverse !mr-1",
      ),
    ).toEqual([
      "ml-2",
      "md:pr-4",
      "-left-1",
      "hover:text-right",
      "rounded-l-lg",
      "rounded-tr",
      "border-l",
      "float-left",
      "space-x-reverse",
      "!mr-1",
    ]);
    expect(
      physicalClasses("ms-2 pe-4 start-0 end-1 text-start rounded-s-lg border-e mx-auto px-6 rtl:-scale-x-100 inset-x-0"),
    ).toEqual([]);
  });

  it("scans template literals and honours the escape hatch", () => {
    const src = [
      "const a = cn(`ps-2 ${x} ml-1`);",
      "// i18n-ignore: third-party widget needs a physical offset",
      "const b = 'left-0';",
      "const c = \"pr-3\";",
    ].join("\n");
    expect(findPhysicalClasses("x.tsx", src).map((f) => `${f.line}:${f.text}`)).toEqual(["1:ml-1", "4:pr-3"]);
  });

  it("src/**/*.tsx uses no physical-direction classes", () => {
    const findings = listFiles(ROOT, "src", isTsx).flatMap((file) =>
      findPhysicalClasses(file, fs.readFileSync(path.join(ROOT, file), "utf8")),
    );
    expect(findings.map((f) => `${f.file}:${f.line} ${f.text}`)).toEqual([]);
  });
});
