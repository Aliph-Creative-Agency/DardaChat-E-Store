import fitz, sys, os
d = fitz.open(sys.argv[1]); out = sys.argv[2]
os.makedirs(out, exist_ok=True)
for i, p in enumerate(d, 1):
    p.get_pixmap(dpi=95).save(os.path.join(out, f"p{i:02d}.png"))
print("rendered", d.page_count, "pages")
