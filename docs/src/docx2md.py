# -*- coding: utf-8 -*-
"""Flatten a .docx to markdown, preserving heading levels and tables as pipe rows."""
import zipfile, sys, io
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

def para_text(p):
    return "".join(t.text or "" for t in p.iter(W + "t"))

def style_of(p):
    ppr = p.find(W + "pPr")
    if ppr is None:
        return ""
    st = ppr.find(W + "pStyle")
    return st.get(W + "val") if st is not None else ""

def main(src, dst):
    z = zipfile.ZipFile(src)
    root = ET.fromstring(z.read("word/document.xml"))
    body = root.find(W + "body")
    out = []
    for el in body:
        tag = el.tag
        if tag == W + "p":
            txt = para_text(el).strip()
            if not txt:
                continue
            st = style_of(el).lower()
            if "heading1" in st:
                out.append("\n# " + txt)
            elif "heading2" in st:
                out.append("\n## " + txt)
            elif "heading3" in st:
                out.append("\n### " + txt)
            else:
                out.append(txt)
        elif tag == W + "tbl":
            rows = []
            for tr in el.findall(W + "tr"):
                cells = []
                for tc in tr.findall(W + "tc"):
                    cells.append(" ".join(para_text(p).strip() for p in tc.findall(W + "p")).strip())
                rows.append(cells)
            if not rows:
                continue
            out.append("")
            width = max(len(r) for r in rows)
            for i, r in enumerate(rows):
                r = r + [""] * (width - len(r))
                out.append("| " + " | ".join(c.replace("|", "\\|") for c in r) + " |")
                if i == 0:
                    out.append("|" + "---|" * width)
            out.append("")
    text = "\n".join(out)
    io.open(dst, "w", encoding="utf-8").write(text)
    print("wrote %s  (%d chars, %d lines)" % (dst, len(text), text.count("\n")))

main(sys.argv[1], sys.argv[2])
