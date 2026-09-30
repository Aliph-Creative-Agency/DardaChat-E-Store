"""Logo crops from the client's Canva brand-profile screenshot (placeholders until SVG arrives)."""
from PIL import Image
import numpy as np
SRC = r"D:/Personal/Projects/DardaChat-E-store/assests/screencapture-canva-design-DAGRC6fkKKQ-y-0zWgKc-SS2MkWwD047vw-view-2026-09-29-21_04_07.png"
OUT = r"D:/Personal/Projects/DardaChat-E-store/design/prototypes/assets/"
im = Image.open(SRC).convert("RGB")
im.crop((595, 104, 1315, 320)).save(OUT + "dardachat-banner.png", optimize=True)          # blue band + pink brush strokes
lock = im.crop((800, 135, 1110, 305)); lock.save(OUT + "dardachat-lockup-on-blue.png", optimize=True)  # mark on blue
# Knockout: remove the flat blue ground -> transparent PNG (white wordmark + pink heart/"Dardachat"), 2x Lanczos.
a = np.asarray(lock).astype(float)
bg = np.median(a[:6, :6].reshape(-1, 3), axis=0)
d = np.linalg.norm(a - bg, axis=2)
alpha = np.clip((d - 18) / 90, 0, 1)
safe = np.maximum(alpha, 1e-3)[..., None]
rgb = np.clip((a - (1 - alpha[..., None]) * bg) / safe, 0, 255)
ko = Image.fromarray(np.dstack([rgb, alpha * 255]).astype("uint8"), "RGBA")
ko = ko.resize((ko.width * 2, ko.height * 2), Image.LANCZOS)
ko.save(OUT + "dardachat-lockup-knockout.png", optimize=True)
print("bg", bg)
