import json, re
DS = r"C:/Users/Obaida/AppData/Local/Temp/claude/D--Personal-Projects-DardaChat-E-store/cfc33bd4-3b2e-41e4-a1a5-1a97ff71ec91/scratchpad/ds/project"
OUT = r"D:/Personal/Projects/DardaChat-E-store/design/prototypes/ds.css"
t = json.load(open(DS + "/tokens.json", encoding="utf-8"))
bundle = open(DS + "/components/bundle.css", encoding="utf-8").read()
m = re.match(r'\s*(@import\s+url\("[^"]*"\)\s*;)\s*', bundle)
imp, rest = m.group(1), bundle[m.end():]

def ref(v):
    return re.sub(r"\{([a-z0-9-]+)\}", r"var(--\1)", v)

light, dark = [], []
def add(name, val):
    if isinstance(val, dict):
        light.append(f"  --{name}: {ref(val['light'])};"); dark.append(f"  --{name}: {ref(val['dark'])};")
    else:
        light.append(f"  --{name}: {ref(val)};")
        if "{" in val: dark.append(f"  --{name}: {ref(val)};")  # re-resolve refs under Night

for tok in t["color"]["tokens"]: add(tok["name"], tok["value"])
light.append("")
for fam, v in t["type"]["families"].items(): light.append(f"  --font-{fam}: {v};")
for g in t["type"]["groups"]:
    for s in g["styles"]:
        light.append(f"  --type-{s['name']}: {s['fontWeight']} {s['fontSize']}/{s['lineHeight']} var(--font-{g['family']});")
light.append("")
for grp in ("spacing", "radius", "shadow", "duration", "easing"):
    for tok in t[grp]["tokens"]: add(tok["name"], tok["value"])
    light.append("")

css = f"""{imp}

/* ==========================================================================
   Dardachat prototypes — ds.css (GENERATED; do not hand-edit)
   1. Tokens from tokens.json -> CSS custom properties.
      Cream theme on :root, Night theme on [data-theme="dark"].
   2. The design system's components/bundle.css, verbatim
      (its Google Fonts @import is hoisted to line 1 because CSS requires
      @import before every other rule).
   3. Prototype base: a few page-level helpers shared by every screen.
   ========================================================================== */

/* ---------- 1. Tokens ---------- */
:root {{
  color-scheme: light;
{chr(10).join(light).rstrip()}
}}

[data-theme="dark"] {{
  color-scheme: dark;
{chr(10).join(dark)}
}}

/* ---------- 2. bundle.css (verbatim) ---------- */
{rest.rstrip()}

/* ---------- 3. Prototype base (not part of the design system) ---------- */
/* DS patches — report back to the design system:
   (a) .dc-qcard__inner is a <span> in the component markup, so its width/height:100% were ignored and the card faces collapsed to 32px.
   (b) In Night, --blue turns light (#8fb3ee) so it reads as text/controls; the logo band would lose its white wordmark.
       The brand book says Night keeps "the brand blue as the ground of hero bands", so bands use --band (fixed brand blue). */
:root {{ --band: #1a4999; --on-band: #ffffff; }}
.dc-qcard__inner {{ display: block; }}
.dc-hero {{ background: var(--band); }}
*, *::before, *::after {{ box-sizing: border-box; }}
html {{ -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }}
body {{ min-height: 100vh; min-height: 100dvh; font: var(--type-body); }}
html[lang="ar"] body {{ letter-spacing: 0; }}
img, svg {{ max-width: 100%; }}
/* Focus ring everywhere, not only inside .dc-root */
:focus-visible {{ outline: 3px solid var(--focus); outline-offset: 3px; }}
.dc-page {{ max-width: 1200px; margin-inline: auto; padding-inline: var(--space-4); }}
@media (min-width: 768px) {{ .dc-page {{ padding-inline: var(--space-5); }} }}
.dc-sr {{ position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }}
.dc-skip {{ position: absolute; inset-inline-start: var(--space-4); inset-block-start: -100px; z-index: 1000; background: var(--blue); color: var(--on-blue);
  padding: 10px 16px; border-radius: var(--radius-pill); font: 600 14px/1 var(--font-sans); text-decoration: none; }}
.dc-skip:focus {{ inset-block-start: var(--space-3); }}
/* Placeholder marker: anything not final gets this tag */
.dc-ph {{ display: inline-block; font: 600 11px/1 var(--font-sans); padding: 4px 8px; border-radius: var(--radius-pill);
  background: var(--surface-sunk); color: var(--warning); box-shadow: inset 0 0 0 1px currentColor; }}
/* Language swap: [data-ar]/[data-en] text is swapped by _shared.js; these hide whole blocks per language */
html[lang="ar"] [data-only="en"], html[lang="en"] [data-only="ar"] {{ display: none !important; }}
/* Manual reduced-motion (toggle in _shared.js sets html[data-motion="reduce"]) mirrors the media query */
html[data-motion="reduce"] *, html[data-motion="reduce"] *::before, html[data-motion="reduce"] *::after {{
  animation-duration: 1ms !important; animation-iteration-count: 1 !important; transition-duration: 1ms !important; scroll-behavior: auto !important; }}
html[data-motion="reduce"] .dc-brush.is-drawing path {{ stroke-dashoffset: 0; }}
/* Prototype toolbar injected by _shared.js (lang / theme / motion) */
.dc-proto-bar {{ position: fixed; inset-block-end: var(--space-3); inset-inline-start: var(--space-3); z-index: 900; display: flex; gap: 4px; padding: 4px;
  background: var(--surface); border-radius: var(--radius-pill); box-shadow: var(--shadow-lift); font: 600 12px/1 var(--font-sans); }}
.dc-proto-bar button {{ font: inherit; color: var(--ink); background: transparent; border: 0; border-radius: var(--radius-pill); padding: 8px 10px; cursor: pointer; min-height: 32px; }}
.dc-proto-bar button:hover {{ background: var(--surface-sunk); }}
.dc-proto-bar button[aria-pressed="true"] {{ background: var(--blue); color: var(--on-blue); }}
@media print {{ .dc-proto-bar {{ display: none; }} }}
"""
open(OUT, "w", encoding="utf-8", newline="\n").write(css)
print(len(css), "bytes")
