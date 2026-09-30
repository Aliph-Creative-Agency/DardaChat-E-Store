# Resize shots/thumbs/*-full.png to 720x450 JPEGs for index.html, and write a review contact sheet to _build/shots/thumbs-sheet.png.
import glob, os
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__)); T = os.path.join(here, '..', 'shots', 'thumbs')
outs = []
for f in sorted(glob.glob(os.path.join(T, '*-full.png'))):
    im = Image.open(f).convert('RGB').resize((720, 450), Image.LANCZOS)
    o = f.replace('-full.png', '.jpg'); im.save(o, quality=84, optimize=True, progressive=True); outs.append(o)
cols = 4; rows = (len(outs) + cols - 1) // cols
sheet = Image.new('RGB', (cols * 360, rows * 225), 'white')
for i, o in enumerate(outs):
    sheet.paste(Image.open(o).resize((360, 225)), ((i % cols) * 360, (i // cols) * 225))
os.makedirs(os.path.join(here, 'shots'), exist_ok=True)
sheet.save(os.path.join(here, 'shots', 'thumbs-sheet.png'))
print(len(outs), [os.path.getsize(o) // 1024 for o in outs])
