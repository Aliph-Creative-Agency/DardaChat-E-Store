import zipfile, sys, re
import xml.etree.ElementTree as ET

p = sys.argv[1]
z = zipfile.ZipFile(p)
names = z.namelist()
print("parts:", len(names))
for n in ["[Content_Types].xml", "word/document.xml", "word/styles.xml", "word/numbering.xml",
          "word/footer1.xml", "word/_rels/document.xml.rels"]:
    print(("  OK  " if n in names else "  MISS") , n)

bad = []
for n in names:
    if n.endswith(".xml") or n.endswith(".rels"):
        try:
            ET.fromstring(z.read(n))
        except Exception as e:
            bad.append((n, str(e)))
print("malformed xml parts:", bad if bad else "none")

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
root = ET.fromstring(z.read("word/document.xml"))
paras = root.iter(W + "p")
np = sum(1 for _ in paras)
nt = sum(1 for _ in root.iter(W + "tbl"))
ntr = sum(1 for _ in root.iter(W + "tr"))
ntc = sum(1 for _ in root.iter(W + "tc"))
print(f"paragraphs={np} tables={nt} rows={ntr} cells={ntc}")

text = "".join(e.text or "" for e in root.iter(W + "t"))
print("chars of text:", len(text))

checks = [
 "SOFTWARE REQUIREMENTS SPECIFICATION", "ISO/IEC/IEEE 29148:2018",
 "FR-CAT-001", "FR-PAY-009", "FR-JRN-020", "NFR-PERF-006", "FR-DAT-006",
 "OI-01", "OI-14", "AS-14", "CON-09", "PLACEHOLDER", "ASSUMPTION",
 "Appendix A", "Appendix C", "Revision history",
]
for c in checks:
    print(("  OK  " if c in text else "  MISS"), c)

ar = re.findall(r"[؀-ۿ]+", text)
print("arabic tokens found:", len(ar), ar[:6])

# every requirement id present?
ids = sorted(set(re.findall(r"\b(?:FR|NFR|UI|CI|CON|AS|OI)-[A-Z]{0,4}-?\d{2,3}\b", text)))
print("distinct requirement ids:", len(ids))
