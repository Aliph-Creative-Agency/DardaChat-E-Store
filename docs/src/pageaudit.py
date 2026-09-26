import fitz, sys
d = fitz.open(sys.argv[1])
print(f"{'pg':>3} {'chars':>6}  {'top':>5} {'bottom':>6}  first line")
for i, p in enumerate(d, 1):
    blocks = [b for b in p.get_text("blocks") if b[4].strip() and "SRS-DARDCHAT" not in b[4]]
    n = sum(len(b[4].strip()) for b in blocks)
    if blocks:
        top = min(b[1] for b in blocks); bot = max(b[3] for b in blocks)
        first = blocks[0][4].strip().split("\n")[0][:52]
    else:
        top = bot = 0; first = "*** BLANK PAGE ***"
    flag = ""
    if n == 0: flag = "  <== BLANK"
    elif bot < 500: flag = "  <== short page, big trailing gap"
    elif top > 150: flag = "  <== large top gap"
    print(f"{i:>3} {n:>6}  {top:>5.0f} {bot:>6.0f}  {first}{flag}")
