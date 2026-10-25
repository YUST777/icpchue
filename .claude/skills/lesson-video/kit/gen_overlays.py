"""Generate the HyperFrames projects for the part title cards and the lower thirds from plan.py.

    python3 -I gen_overlays.py     # writes cards/index.html and lowers/index.html
"""
import html
from pathlib import Path

import plan

HERE = Path(__file__).parent
N = len(plan.PARTS)
GSAP = '<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>'

BASE_CSS = """
@font-face{font-family:'Noto Kufi Arabic';src:url('assets/fonts/NotoKufiArabic-Bold.ttf');font-weight:700}
:root{--ground:#06152B;--surface:#0B2A55;--blue:#1F65A4;--sky:#5AB0FF;--ink:#F4F8FF;--muted:#9DB6D6}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1920px;height:1080px;overflow:hidden;font-family:'Inter',sans-serif;color:var(--ink)}
.ar{font-family:'Noto Kufi Arabic','Inter',sans-serif;direction:rtl;font-weight:700}
"""


def esc(s):
    return html.escape(s, quote=True)


def cards():
    total = plan.AGENDA_SECONDS + N * plan.CARD_SECONDS
    css = BASE_CSS + """
html,body{background:var(--ground)}
.scene{position:absolute;inset:0;overflow:hidden;
  background:radial-gradient(1100px 700px at 78% 30%,#0E3470 0%,rgba(14,52,112,0) 70%),var(--ground)}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(90,176,255,.16) 2px,transparent 2px);background-size:64px 64px;
  mask-image:radial-gradient(900px 600px at 70% 40%,#000,transparent 75%);-webkit-mask-image:radial-gradient(900px 600px at 70% 40%,#000,transparent 75%)}
.num{position:absolute;right:70px;top:90px;font-size:760px;font-weight:800;line-height:.9;letter-spacing:-.06em;color:rgba(90,176,255,.09);font-variant-numeric:tabular-nums}
.content{position:relative;width:100%;height:100%;padding:90px 140px;display:flex;flex-direction:column;justify-content:center;gap:26px}
.logo{position:absolute;left:140px;top:70px;height:84px}
.eyebrow{font-size:28px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--sky)}
.title{font-size:136px;font-weight:800;letter-spacing:-.025em;line-height:1.02;max-width:1400px}
.titlear{font-size:84px;color:var(--sky);text-align:left;max-width:1400px}
.sub{font-size:40px;font-weight:600;color:var(--muted);margin-top:8px}
.prog{position:absolute;left:140px;right:140px;bottom:90px;display:flex;gap:10px;align-items:center}
.seg{flex:1;height:12px;border-radius:6px;background:rgba(157,182,214,.22);overflow:hidden}
.seg i{display:block;width:100%;height:100%;background:var(--sky);transform-origin:left;transform:scaleX(0)}
.count{position:absolute;right:140px;bottom:120px;font-size:30px;font-weight:600;color:var(--muted);letter-spacing:.08em}
.panel{position:absolute;inset:0;background:var(--blue);transform-origin:right}
.panel.out{transform-origin:left;transform:scaleX(0)}
.agenda{display:grid;grid-template-columns:1fr 1fr;gap:18px 70px;margin-top:20px}
.row{display:flex;align-items:baseline;gap:22px;font-size:38px;font-weight:600}
.row b{width:62px;color:var(--sky);font-variant-numeric:tabular-nums}
.row span.t{margin-left:auto;color:var(--muted);font-variant-numeric:tabular-nums;font-size:32px}
.agtitle{font-size:104px;font-weight:800;letter-spacing:-.025em;line-height:1.02}
"""
    scenes, js = [], []
    # agenda scene
    t0 = 0.0
    rows = "".join(
        f'<div class="row ag-row"><b>{i + 1:02d}</b><span>{esc(p["en"])}</span>'
        f'<span class="t">{plan.mmss(fs + plan.AGENDA_SECONDS + i * plan.CARD_SECONDS)}</span></div>'
        for (i, _s, _e, fs, _fe), p in zip(plan.part_ranges(), plan.PARTS)
    )
    scenes.append(f"""
<div id="sc0" class="scene clip" data-start="0" data-duration="{plan.AGENDA_SECONDS}" data-track-index="0">
  <div class="dots"></div>
  <img class="logo" src="assets/icpchue_logo.png" alt="ICPC HUE" />
  <div class="content">
    <div class="eyebrow ag-e">Session overview</div>
    <div class="agtitle ag-t">Conditions, Switch<br>and Loops in C++</div>
    <div class="agenda">{rows}</div>
  </div>
  <div class="panel in" id="pin0"></div><div class="panel out" id="pout0"></div>
</div>""")
    js.append(f"""
tl.to("#pin0",{{scaleX:0,duration:.55,ease:"power4.inOut"}},.1);
tl.from("#sc0 .logo",{{opacity:0,y:-20,duration:.5,ease:"power2.out"}},.5);
tl.from("#sc0 .ag-e",{{opacity:0,y:24,duration:.5,ease:"power2.out"}},.6);
tl.from("#sc0 .ag-t",{{opacity:0,y:50,duration:.8,ease:"expo.out"}},.7);
tl.from("#sc0 .ag-row",{{opacity:0,x:-40,duration:.5,ease:"power3.out",stagger:.1}},1.1);
tl.to("#pout0",{{scaleX:1,duration:.5,ease:"power4.inOut"}},{plan.AGENDA_SECONDS - 0.55});""")
    t0 = plan.AGENDA_SECONDS
    for i, p in enumerate(plan.PARTS):
        d = plan.CARD_SECONDS
        segs = "".join(f'<div class="seg"><i class="si{i}-{k}"></i></div>' for k in range(N))
        scenes.append(f"""
<div id="sc{i + 1}" class="scene clip" data-start="{t0:.2f}" data-duration="{d}" data-track-index="{i + 1}">
  <div class="dots"></div>
  <div class="num n{i}">{i + 1:02d}</div>
  <img class="logo" src="assets/icpchue_logo.png" alt="ICPC HUE" />
  <div class="content">
    <div class="eyebrow e{i}">Part {i + 1:02d} of {N}</div>
    <div class="title t{i}">{esc(p['en'])}</div>
    <div class="titlear ar a{i}">{esc(p['ar'])}</div>
    <div class="sub s{i}">{esc(p['sub'])}</div>
  </div>
  <div class="count c{i}">{i + 1:02d} / {N}</div>
  <div class="prog pg{i}">{segs}</div>
  <div class="panel" id="pin{i + 1}"></div><div class="panel out" id="pout{i + 1}"></div>
</div>""")
        fills = "".join(
            f'tl.to(".si{i}-{k}",{{scaleX:1,duration:.35,ease:"power2.out"}},{t0 + 0.9 + k * 0.04:.2f});' for k in range(i + 1)
        )
        js.append(f"""
tl.to("#pin{i + 1}",{{scaleX:0,duration:.55,ease:"power4.inOut"}},{t0 + 0.1:.2f});
tl.from("#sc{i + 1} .logo",{{opacity:0,y:-20,duration:.5,ease:"power2.out"}},{t0 + 0.5:.2f});
tl.from(".n{i}",{{opacity:0,scale:.86,x:80,duration:.9,ease:"expo.out"}},{t0 + 0.4:.2f});
tl.from(".e{i}",{{opacity:0,y:24,duration:.5,ease:"power2.out"}},{t0 + 0.6:.2f});
tl.from(".t{i}",{{opacity:0,y:60,duration:.8,ease:"expo.out"}},{t0 + 0.7:.2f});
tl.from(".a{i}",{{opacity:0,y:40,duration:.7,ease:"power3.out"}},{t0 + 0.9:.2f});
tl.from(".s{i}",{{opacity:0,y:24,duration:.6,ease:"power2.out"}},{t0 + 1.1:.2f});
tl.from(".c{i}",{{opacity:0,duration:.5,ease:"power2.out"}},{t0 + 1.0:.2f});
{fills}
tl.to("#pout{i + 1}",{{scaleX:1,duration:.5,ease:"power4.inOut"}},{t0 + d - 0.55:.2f});""")
        t0 += d
    doc = f"""<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=1920, height=1080"/>
{GSAP}
<style>{css}</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{total:.2f}" data-width="1920" data-height="1080">
{''.join(scenes)}
</div>
<script>
window.__timelines = window.__timelines || {{}};
const tl = gsap.timeline({{ paused: true }});
{''.join(js)}
window.__timelines["main"] = tl;
</script></body></html>
"""
    (HERE / "cards" / "index.html").write_text(doc, encoding="utf-8")


def lowers():
    d = plan.HEAD_SECONDS
    total = N * d
    css = BASE_CSS + """
html,body{background:transparent}
.scene{position:absolute;inset:0;overflow:hidden;background:transparent}
.lt{position:absolute;left:80px;bottom:84px;display:flex;align-items:stretch;border-radius:14px;overflow:hidden;
  background:rgba(6,21,43,.92);box-shadow:0 0 0 2px rgba(90,176,255,.35),0 12px 40px rgba(6,21,43,.45)}
.badge{width:96px;display:flex;align-items:center;justify-content:center;background:var(--blue);font-size:44px;font-weight:800;font-variant-numeric:tabular-nums}
.txt{padding:18px 34px 18px 28px;display:flex;flex-direction:column;gap:4px;min-width:420px}
.k{font-size:22px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--sky)}
.en{font-size:46px;font-weight:800;letter-spacing:-.01em;line-height:1.1}
.ar{font-size:32px;color:var(--sky);text-align:left}
"""
    scenes, js = [], []
    for i, p in enumerate(plan.PARTS):
        t0 = i * d
        scenes.append(f"""
<div id="lt{i}" class="scene clip" data-start="{t0:.2f}" data-duration="{d}" data-track-index="{i}">
  <div class="lt l{i}"><div class="badge">{i + 1:02d}</div>
    <div class="txt"><div class="k">Part {i + 1:02d} of {N}</div><div class="en">{esc(p['en'])}</div><div class="ar">{esc(p['ar'])}</div></div></div>
</div>""")
        js.append(f"""
tl.from(".l{i}",{{x:-120,opacity:0,duration:.6,ease:"expo.out"}},{t0 + 0.4:.2f});
tl.to(".l{i}",{{x:-120,opacity:0,duration:.5,ease:"power2.in"}},{t0 + d - 0.7:.2f});""")
    doc = f"""<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=1920, height=1080"/>
{GSAP}
<style>{css}</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{total:.2f}" data-width="1920" data-height="1080">
{''.join(scenes)}
</div>
<script>
window.__timelines = window.__timelines || {{}};
const tl = gsap.timeline({{ paused: true }});
{''.join(js)}
window.__timelines["main"] = tl;
</script></body></html>
"""
    (HERE / "lowers" / "index.html").write_text(doc, encoding="utf-8")


if __name__ == "__main__":
    cards()
    lowers()
    print("wrote cards/index.html and lowers/index.html")
