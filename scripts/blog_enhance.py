#!/usr/bin/env python3
"""
Shared post-render enhancements for blog article HTML.

Imported by render-blog.py so new articles get them at render time, and by
scripts/blog-upgrade-design.py so the already-published articles get the same
treatment without a full re-render (a re-render would revert hand-edited
internal links and restamp dates).

Three transforms, all idempotent:

1. convert_leaked_tables - some markdown sources put the table header on the
   same line as the preceding sentence. Python-Markdown only recognises a pipe
   table when the header starts its own line, so those tables leaked into the
   page as raw text with visible |---|---| separator rows. This rebuilds them.

2. enhance_tables - wraps every table in .tbl-wrap and copies the header text
   onto each cell as data-label, which is what lets the CSS restack tables as
   readable cards on narrow screens instead of forcing a sideways scroll.

3. spec_to_chips - the "Type: / Price: / Location: / Best for:" lines were a
   single paragraph with pipe separators and a raw newline. The newline
   collapsed to a space, so "Price" and "Location" ran together with no
   separator at all. Becomes a proper chip list.
"""
import re
import html as _html

TBL_WRAP_OPEN = '<div class="tbl-wrap">'


def _split_row(line):
    """Split a markdown table row into cells, tolerating optional outer pipes."""
    line = line.strip()
    if line.startswith('|'):
        line = line[1:]
    if line.endswith('|'):
        line = line[:-1]
    return [c.strip() for c in line.split('|')]


def _is_sep_row(line):
    """A markdown alignment row: |---|:--:|---|"""
    s = line.strip()
    if not s or '-' not in s:
        return False
    s = s.strip('|')
    parts = [p.strip() for p in s.split('|')]
    return bool(parts) and all(re.fullmatch(r':?-{2,}:?', p) for p in parts)


def _clean_cell(c):
    """Blank and stray-comma cells become an en dash, the usual no-data marker."""
    c = c.strip()
    if c in ('', ',', '.', '-'):
        return '&ndash;'
    return c


def _build_table(header, rows):
    out = [TBL_WRAP_OPEN, '<table>', '<thead>', '<tr>']
    for h in header:
        out.append('<th>%s</th>' % _clean_cell(h))
    out += ['</tr>', '</thead>', '<tbody>']
    for r in rows:
        # pad or trim to the header width so the grid never goes ragged
        r = (r + [''] * len(header))[:len(header)]
        out.append('<tr>')
        for i, c in enumerate(r):
            label = re.sub(r'<[^>]+>', '', header[i]).strip() if i < len(header) else ''
            attr = ' data-label="%s"' % _html.escape(label, quote=True) if label else ''
            out.append('<td%s>%s</td>' % (attr, _clean_cell(c)))
        out.append('</tr>')
    out += ['</tbody>', '</table>', '</div>']
    return '\n'.join(out)


def convert_leaked_tables(doc):
    """Rebuild pipe tables that Markdown left as raw text inside a <p>."""
    def repl(m):
        inner = m.group(1)
        lines = inner.split('\n')
        # locate the alignment row; the header is the line before it
        sep_i = next((i for i, l in enumerate(lines) if _is_sep_row(l)), None)
        if sep_i is None or sep_i == 0:
            return m.group(0)
        header_line = lines[sep_i - 1]
        # the header may be glued to the end of a prose sentence: split at the
        # first pipe that begins the run of cells
        prose, _, header_part = header_line.partition('|')
        if not header_part.strip():
            return m.group(0)
        header = _split_row('|' + header_part)
        body = []
        end = sep_i + 1
        for l in lines[sep_i + 1:]:
            if '|' not in l:
                break
            body.append(_split_row(l))
            end += 1
        if not body:
            return m.group(0)
        out = []
        pre = '\n'.join(lines[:sep_i - 1] + ([prose.strip()] if prose.strip() else []))
        if pre.strip():
            out.append('<p>%s</p>' % pre.strip())
        out.append(_build_table(header, body))
        tail = '\n'.join(lines[end:]).strip()
        if tail:
            out.append('<p>%s</p>' % tail)
        return '\n'.join(out)

    return re.sub(r'<p>(.*?)</p>', repl, doc, flags=re.S)


def enhance_tables(doc):
    """Wrap tables and add data-label to cells. Safe to run repeatedly."""
    def repl(m):
        table = m.group(0)
        ths = re.findall(r'<th[^>]*>(.*?)</th>', table, re.S)
        labels = [re.sub(r'<[^>]+>', '', t).strip() for t in ths]
        if labels and 'data-label' not in table:
            def row(rm):
                cells = re.findall(r'<td([^>]*)>(.*?)</td>', rm.group(1), re.S)
                if not cells:
                    return rm.group(0)
                parts = []
                for i, (attrs, val) in enumerate(cells):
                    lab = labels[i] if i < len(labels) else ''
                    add = '' if ('data-label' in attrs or not lab) else \
                        ' data-label="%s"' % _html.escape(lab, quote=True)
                    parts.append('<td%s%s>%s</td>' % (attrs, add, val))
                return '<tr>' + ''.join(parts) + '</tr>'
            body = re.search(r'<tbody>(.*?)</tbody>', table, re.S)
            if body:
                new_body = re.sub(r'<tr>(.*?)</tr>', row, body.group(1), flags=re.S)
                table = table.replace(body.group(1), new_body, 1)
            else:
                table = re.sub(r'<tr>(.*?)</tr>',
                               lambda rm: row(rm) if '<td' in rm.group(1) else rm.group(0),
                               table, flags=re.S)
        return table

    doc = re.sub(r'<table[^>]*>.*?</table>', repl, doc, flags=re.S)
    # wrap any table not already wrapped
    def wrap(m):
        before = doc[max(0, m.start() - 220):m.start()]
        if 'tbl-wrap' in before:
            return m.group(0)
        return TBL_WRAP_OPEN + m.group(0) + '</div>'
    return re.sub(r'<table[^>]*>.*?</table>', wrap, doc, flags=re.S)


SPEC_LABEL = re.compile(r'<strong>\s*([^<:]{2,26}):\s*</strong>')


def spec_to_chips(doc):
    """Turn a pipe-separated run of '<strong>Label:</strong> value' into chips."""
    def repl(m):
        inner = m.group(1)
        if 'class="spec"' in inner:
            return m.group(0)
        labels = SPEC_LABEL.findall(inner)
        # needs to look like a spec line, not prose that happens to start bold
        if len(labels) < 2 or '|' not in inner:
            return m.group(0)
        if not inner.lstrip().startswith('<strong>'):
            return m.group(0)
        # split on pipes and newlines, keeping any inline HTML in the values
        segs = [s.strip() for s in re.split(r'\s*\|\s*|\n', inner) if s.strip()]
        items = []
        for s in segs:
            lm = SPEC_LABEL.match(s.lstrip())
            if lm:
                val = s.lstrip()[lm.end():].strip()
                items.append('<li><b>%s</b> %s</li>' % (lm.group(1).strip(), val))
            elif items:
                # a trailing fragment such as a bare link belongs to the last chip
                items[-1] = items[-1].replace('</li>', ' %s</li>' % s)
            else:
                return m.group(0)
        if len(items) < 2:
            return m.group(0)
        return '<ul class="spec">%s</ul>' % ''.join(items)

    return re.sub(r'<p>(.*?)</p>', repl, doc, flags=re.S)


def enhance(doc):
    """All transforms, in dependency order."""
    doc = convert_leaked_tables(doc)
    doc = enhance_tables(doc)
    doc = spec_to_chips(doc)
    return doc


# ─── DESIGN LAYER ───
DESIGN_CSS = '<style id="blog-design">\n/* ─── Reading rhythm ─────────────────────────────────────────────── */\n.article{max-width:760px}\n.article-meta{font-size:.78rem;letter-spacing:.06em;margin-bottom:26px}\n.article-meta + p{font-size:1.2rem;line-height:1.68;color:rgba(240,239,233,.84);margin-bottom:30px}\n.article p{font-size:1.06rem;line-height:1.78;margin-bottom:22px}\n.article h2{font-size:clamp(1.42rem,2.6vw,1.95rem);letter-spacing:-.02em;margin:58px 0 16px}\n.article h3{font-size:1.16rem;margin:36px 0 10px}\n.article h2 + p,.article h3 + p{margin-top:0}\n.article ul,.article ol{margin:0 0 24px 22px}\n.article li{margin-bottom:9px;line-height:1.72}\n.article li::marker{color:rgba(2,243,197,.55)}\n/* an <hr> immediately followed by <h2> was stacking two 48px margins into a\n   ~100px hole between sections, which is the gap flagged in review */\n.article hr{margin:40px 0}\n.article hr + h2{margin-top:0}\n.article blockquote{margin:30px 0;border-radius:0 10px 10px 0}\n\n/* ─── Spec chips ─────────────────────────────────────────────────────\n   Was one paragraph of "Type: x | Price: y \\n Location: z". The newline\n   collapsed to a space, so Price and Location ran together unseparated. */\n.article ul.spec{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:0 0 26px;padding:0}\n.article ul.spec li{display:inline-flex;align-items:baseline;gap:7px;margin:0;font-size:.84rem;line-height:1.45;padding:7px 14px;border:1px solid rgba(240,239,233,.11);border-radius:100px;background:rgba(240,239,233,.028);color:var(--white60)}\n.article ul.spec li::marker{content:""}\n.article ul.spec b{font-size:.62rem;letter-spacing:.13em;text-transform:uppercase;color:var(--white38);font-weight:700;white-space:nowrap}\n.article ul.spec a{border-bottom:none;color:var(--cyan);font-weight:600}\n\n/* ─── Comparison tables ──────────────────────────────────────────── */\n.article .tbl-wrap{margin:30px 0;border:1px solid rgba(240,239,233,.1);border-radius:14px;background:rgba(240,239,233,.022);overflow-x:auto;-webkit-overflow-scrolling:touch}\n.article table{width:100%;border-collapse:collapse;font-size:.94rem}\n.article thead th{text-align:left;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--white38);padding:13px 16px;background:rgba(240,239,233,.04);border-bottom:1px solid rgba(240,239,233,.1);white-space:nowrap}\n.article tbody td{padding:13px 16px;border-bottom:1px solid rgba(240,239,233,.055);color:var(--white60);line-height:1.55;vertical-align:top}\n.article tbody tr:last-child td{border-bottom:none}\n.article tbody tr{transition:background .2s}\n.article tbody tr:hover{background:rgba(2,243,197,.022)}\n.article tbody td:first-child{color:var(--white);font-weight:600}\n.article table a{border-bottom:none;color:var(--cyan)}\n\n/* ─── Breadcrumbs: separators were bare text nodes between flex items ─── */\n.breadcrumbs{gap:9px;white-space:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}\n.breadcrumbs::-webkit-scrollbar{display:none}\n.breadcrumbs > span:last-child{color:var(--white38);overflow:hidden;text-overflow:ellipsis}\n.bc-sep{color:rgba(240,239,233,.32)}\n\n/* ─── Particle field, desktop only, behind the copy ───────────────── */\n#globalParticles{position:fixed;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}\n.hero-banner{z-index:2}\n@media(max-width:860px){#globalParticles{display:none}}\n\n/* ─── Mobile ─────────────────────────────────────────────────────── */\n@media(max-width:860px){\n  .article{padding:14px 22px 78px;max-width:100%}\n  .article-meta{margin-bottom:20px}\n  .article-meta + p{font-size:1.1rem;margin-bottom:24px}\n  .article h2{margin:44px 0 13px}\n  .article h3{margin:30px 0 9px}\n  .article hr{margin:34px 0}\n  .breadcrumbs{padding:0 22px}\n}\n/* Comparison tables restack as cards instead of scrolling sideways */\n@media(max-width:600px){\n  .article .tbl-wrap{border:none;background:none;border-radius:0;overflow:visible}\n  .article table,.article tbody,.article tbody tr,.article tbody td{display:block;width:100%}\n  .article thead{display:none}\n  .article tbody tr{border:1px solid rgba(240,239,233,.11);border-radius:12px;background:rgba(240,239,233,.028);margin-bottom:12px;padding:2px 0}\n  .article tbody tr:hover{background:rgba(240,239,233,.028)}\n  .article tbody td{border-bottom:1px solid rgba(240,239,233,.05);padding:10px 15px}\n  .article tbody td:last-child{border-bottom:none}\n  .article tbody td:first-child{font-size:1.02rem;padding-top:13px}\n  .article tbody td[data-label]:not(:first-child)::before{content:attr(data-label);display:block;font-size:.58rem;letter-spacing:.13em;text-transform:uppercase;color:var(--white38);font-weight:700;margin-bottom:3px}\n  .article ul.spec{gap:6px}\n  .article ul.spec li{font-size:.79rem;padding:6px 12px;width:100%}\n}\n@media(max-width:420px){.article{padding:12px 18px 78px}.article p{font-size:1.02rem}}\n</style>'

PARTICLES = '<canvas id="globalParticles"></canvas>\n<script>/* SABDA global particle field, desktop only and off for reduced-motion */\n(function(){\n  if(window.innerWidth<861)return;\n  if(window.matchMedia&&window.matchMedia(\'(prefers-reduced-motion: reduce)\').matches)return;\n\n  const canvas=document.getElementById(\'globalParticles\');\n  if(!canvas)return;\n  const ctx=canvas.getContext(\'2d\');\n  let W,H;\n  let mouseX=-9999,mouseY=-9999;\n\n  function resize(){\n    W=window.innerWidth;H=window.innerHeight;\n    canvas.width=W*devicePixelRatio;\n    canvas.height=H*devicePixelRatio;\n    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);\n  }\n  resize();\n  window.addEventListener(\'resize\',resize);\n  document.addEventListener(\'mousemove\',e=>{mouseX=e.clientX;mouseY=e.clientY});\n\n  const COUNT=672;\n  const particles=Array.from({length:COUNT},()=>({\n    x:Math.random()*3000,\n    y:Math.random(),\n    vx:0.008+Math.random()*0.06,\n    vy:(Math.random()-0.5)*0.003,\n    fx:0,fy:0,\n    size:0.3+Math.random()*1.5,\n    glow:4+Math.random()*16,\n    color:(()=>{const c=Math.random();return c<0.38?[2,243,197]:c<0.72?[248,166,163]:[32,57,153]})(),\n    opacity:0.025+Math.random()*0.12,\n    phase:Math.random()*Math.PI*2,\n    waveAmp:0.01+Math.random()*0.04,\n    waveFreq:0.0001+Math.random()*0.0005,\n  }));\n\n  let t=0;\n  function draw(){\n    t++;\n    ctx.clearRect(0,0,W,H);\n    particles.forEach(p=>{\n      p.x+=p.vx;\n      p.y+=p.vy;\n      const waveY=p.waveAmp*Math.sin(p.phase+t*p.waveFreq);\n      let drawX=p.x+p.fx;\n      let drawY=(p.y+waveY)*H+p.fy;\n      const dx=drawX-mouseX;const dy=drawY-mouseY;\n      const dist=Math.sqrt(dx*dx+dy*dy);\n      if(dist<120&&dist>0){const force=(1-dist/120)*2.5;p.fx+=(dx/dist)*force;p.fy+=(dy/dist)*force}\n      p.fx*=0.94;p.fy*=0.94;\n      drawX=p.x+p.fx;drawY=(p.y+waveY)*H+p.fy;\n      if(p.x>W+60){p.x=-50;p.y=Math.random();p.fx=0;p.fy=0}\n      if(p.y<-0.05)p.y=1.05;if(p.y>1.05)p.y=-0.05;\n      const pulse=0.4+0.6*Math.sin(p.phase+t*0.001);const op=p.opacity*pulse;\n      if(op<0.002)return;\n      const g=ctx.createRadialGradient(drawX,drawY,0,drawX,drawY,p.glow);\n      g.addColorStop(0,`rgba(${p.color[0]},${p.color[1]},${p.color[2]},${op*0.7})`);\n      g.addColorStop(0.3,`rgba(${p.color[0]},${p.color[1]},${p.color[2]},${op*0.28})`);\n      g.addColorStop(0.7,`rgba(${p.color[0]},${p.color[1]},${p.color[2]},${op*0.04})`);\n      g.addColorStop(1,`rgba(${p.color[0]},${p.color[1]},${p.color[2]},0)`);\n      ctx.fillStyle=g;ctx.beginPath();ctx.arc(drawX,drawY,p.glow,0,Math.PI*2);ctx.fill();\n      ctx.beginPath();ctx.arc(drawX,drawY,p.size*0.5,0,Math.PI*2);\n      ctx.fillStyle=`rgba(${p.color[0]},${p.color[1]},${p.color[2]},${Math.min(0.6,op*2)})`;ctx.fill();\n    });\n    requestAnimationFrame(draw);\n  }\n  requestAnimationFrame(draw);\n})();</script>'


def fix_breadcrumb_seps(doc):
    """Wrap the bare " / " text nodes so flex spacing is predictable."""
    def repl(m):
        inner = m.group(1)
        if 'bc-sep' in inner:
            return m.group(0)
        inner = re.sub(r'>\s*/\s*<', '><span class="bc-sep">/</span><', inner)
        return m.group(0).replace(m.group(1), inner, 1)
    return re.sub(r'<nav[^>]*class="breadcrumbs"[^>]*>(.*?)</nav>', repl, doc, flags=re.S)


def inject_design(doc):
    """Add the design stylesheet and the particle field. Idempotent."""
    if 'id="blog-design"' not in doc:
        doc = doc.replace('</head>', DESIGN_CSS + '\n</head>', 1)
    if 'globalParticles' not in doc:
        doc = doc.replace('</body>', PARTICLES + '\n</body>', 1)
    doc = fix_breadcrumb_seps(doc)
    return doc
