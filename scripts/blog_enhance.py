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
        own = 'SABDA' in re.sub(r'<[^>]+>', '', r[0] if r else '').upper()
        out.append('<tr class="own">' if own else '<tr>')
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

    # tag the row that is us, so the comparison reads at a glance
    def own_rows(m):
        body = m.group(1)
        def one(rm):
            row = rm.group(0)
            if 'class="own"' in row:
                return row
            first = re.search(r'<td[^>]*>(.*?)</td>', row, re.S)
            if first and 'SABDA' in re.sub(r'<[^>]+>', '', first.group(1)).upper():
                return row.replace('<tr>', '<tr class="own">', 1)
            return row
        return '<tbody>' + re.sub(r'<tr>.*?</tr>', one, body, flags=re.S) + '</tbody>'
    doc = re.sub(r'<tbody>(.*?)</tbody>', own_rows, doc, flags=re.S)

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
DESIGN_CSS = '<style id="blog-design">\n/* ── Breadcrumbs ──────────────────────────────────────────────────────\n   These live in a <nav>, so the site-wide `nav {}` rule was applying to them:\n   justify-content:space-between spread the crumbs across the full 960px, and\n   height:72px opened a dead band under the hero. On mobile the same rule also\n   handed them the header\'s background, blur and bottom border, so they read as\n   a broken second header. Everything that rule sets is reset here. */\n.breadcrumbs{justify-content:flex-start;height:auto;min-height:0;background:none;-webkit-backdrop-filter:none;backdrop-filter:none;border-bottom:none;padding-top:0;padding-bottom:0;gap:10px;margin:18px auto 0;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;font-size:.74rem}\n.breadcrumbs::-webkit-scrollbar{display:none}\n.breadcrumbs a,.breadcrumbs > span{white-space:nowrap}\n.breadcrumbs > span:last-child{color:var(--white38);overflow:hidden;text-overflow:ellipsis}\n.bc-sep{color:rgba(240,239,233,.28)}\n\n/* ── Reading rhythm ─────────────────────────────────────────────── */\n.article{max-width:748px;padding-top:22px}\n.article-meta{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--white38);margin-bottom:22px}\n.article-meta + p{font-size:1.22rem;line-height:1.62;color:rgba(240,239,233,.88);margin-bottom:28px;font-weight:400}\n.article p{font-size:1.055rem;line-height:1.78;margin-bottom:21px}\n.article h2{font-size:clamp(1.42rem,2.6vw,1.92rem);letter-spacing:-.02em;line-height:1.22;margin:54px 0 15px;color:var(--salmon)}\n.article h3{font-size:1.14rem;margin:34px 0 10px;color:var(--white)}\n.article h2 + p,.article h3 + p{margin-top:0}\n.article ul,.article ol{margin:0 0 23px 21px}\n.article li{margin-bottom:8px;line-height:1.72}\n.article li::marker{color:rgba(248,166,163,.6)}\n.article hr{margin:38px 0}\n.article hr + h2{margin-top:0}\n.article blockquote{margin:28px 0;border-radius:0 10px 10px 0;border-left-color:var(--salmon);background:rgba(248,166,163,.04)}\n\n/* ── Spec list. Was a row of pills, which read as clutter at every width.\n      Now an editorial label/value list with a salmon rule. ── */\n.article ul.spec{margin:24px 0 30px;padding:0;list-style:none;border-left:2px solid rgba(248,166,163,.4)}\n.article ul.spec li{display:flex;gap:20px;margin:0;padding:9px 0 9px 18px;font-size:.96rem;line-height:1.55;color:var(--white60)}\n.article ul.spec li + li{border-top:1px solid rgba(240,239,233,.06)}\n.article ul.spec li::marker{content:""}\n.article ul.spec b{flex:0 0 92px;font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:var(--white38);font-weight:700;padding-top:.34em}\n.article ul.spec a{border-bottom:none;color:var(--cyan);font-weight:600}\n\n/* ── Comparison tables ──────────────────────────────────────────── */\n.article .tbl-wrap{margin:32px 0;border:1px solid rgba(240,239,233,.13);border-radius:16px;background:linear-gradient(180deg,rgba(240,239,233,.038),rgba(240,239,233,.012));overflow-x:auto;-webkit-overflow-scrolling:touch}\n.article table{width:100%;border-collapse:collapse;font-size:.93rem}\n.article thead th{text-align:left;font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:var(--salmon);padding:14px 18px;background:rgba(248,166,163,.055);border-bottom:1px solid rgba(248,166,163,.2);white-space:nowrap}\n.article tbody td{padding:14px 18px;border-bottom:1px solid rgba(240,239,233,.05);color:var(--white60);line-height:1.55;vertical-align:top}\n.article tbody tr:last-child td{border-bottom:none}\n.article tbody tr:nth-child(even) td{background:rgba(240,239,233,.014)}\n.article tbody td:first-child{color:var(--white);font-weight:600}\n/* our own row, so the comparison reads at a glance */\n.article tbody tr.own td{background:rgba(2,243,197,.052)}\n.article tbody tr.own td:first-child{color:var(--cyan);box-shadow:inset 2px 0 0 var(--cyan)}\n.article table a{border-bottom:none;color:var(--cyan)}\n\n/* ── Particle field, desktop only, behind the copy ───────────────── */\n#globalParticles{position:fixed;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}\n.hero-banner{z-index:2}\n@media(max-width:860px){#globalParticles{display:none}}\n\n/* ── Mobile ─────────────────────────────────────────────────────── */\n@media(max-width:860px){\n  .breadcrumbs{padding:0 22px;margin-top:14px;font-size:.7rem}\n  .article{padding:16px 22px 78px;max-width:100%}\n  .article-meta{margin-bottom:16px}\n  .article-meta + p{font-size:1.1rem;line-height:1.62;margin-bottom:24px}\n  .article h2{margin:42px 0 12px;font-size:1.42rem}\n  .article h3{margin:28px 0 9px}\n  .article hr{margin:32px 0}\n  .article ul.spec{margin:20px 0 26px}\n}\n@media(max-width:600px){\n  .article ul.spec li{flex-direction:column;gap:3px;padding:10px 0 10px 15px}\n  .article ul.spec b{flex:none;padding-top:0}\n  /* tables restack as cards rather than scrolling sideways */\n  .article .tbl-wrap{border:none;background:none;border-radius:0;overflow:visible}\n  .article table,.article tbody,.article tbody tr,.article tbody td{display:block;width:100%}\n  .article thead{display:none}\n  .article tbody tr{border:1px solid rgba(240,239,233,.12);border-radius:13px;background:rgba(240,239,233,.026);margin-bottom:12px;padding:3px 0;overflow:hidden}\n  .article tbody tr:nth-child(even) td{background:none}\n  .article tbody tr.own{border-color:rgba(2,243,197,.32);background:rgba(2,243,197,.045)}\n  .article tbody tr.own td{background:none}\n  .article tbody tr.own td:first-child{box-shadow:none}\n  .article tbody td{border-bottom:1px solid rgba(240,239,233,.05);padding:10px 16px}\n  .article tbody td:last-child{border-bottom:none}\n  .article tbody td:first-child{font-size:1.04rem;padding-top:13px}\n  .article tbody td[data-label]:not(:first-child)::before{content:attr(data-label);display:block;font-size:.56rem;letter-spacing:.15em;text-transform:uppercase;color:var(--white38);font-weight:700;margin-bottom:3px}\n}\n@media(max-width:420px){.article{padding:14px 18px 78px}.article p{font-size:1.02rem}.article h2{font-size:1.32rem}}\n</style>'

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
    if 'id="blog-design"' in doc:
        # replace the previous revision so design updates actually land
        doc = re.sub(r'<style id="blog-design">.*?</style>', lambda m: DESIGN_CSS, doc, count=1, flags=re.S)
    else:
        doc = doc.replace('</head>', DESIGN_CSS + '\n</head>', 1)
    # Guard on the canvas element, not the bare id: DESIGN_CSS also contains
    # "#globalParticles", so a substring check on the id always matched and the
    # field was never actually injected.
    if '<canvas id="globalParticles"' not in doc:
        doc = doc.replace('</body>', PARTICLES + '\n</body>', 1)
    doc = fix_breadcrumb_seps(doc)
    return doc


MBLOG_CSS = '<style id="mblog-design">\n/* Mobile blog listing. Was flat full-bleed text rows divided by hairlines, with\n   the ranking number in cyan. Now cards, and the number is salmon to match the\n   article headings. Lives in <head> so blog-release.py, which only rewrites the\n   card block between the hero and the pricing section, cannot clobber it. */\n.blog-hero{min-height:34svh;padding-bottom:20px}\n.blog-hero-c h1{font-size:1.9rem;line-height:1.14}\n.blog-hero-c p{font-size:.84rem}\n.mblog-filters{padding:18px 16px 12px!important}\n.ct{padding:14px 15px;margin:0 16px 10px;border-bottom:none;border:1px solid rgba(240,239,233,.09);border-radius:14px;background:rgba(240,239,233,.022);transition:border-color .2s,background .2s}\n.ct:active{border-color:rgba(248,166,163,.34);background:rgba(248,166,163,.045)}\n.ct-num{width:25px;height:25px;background:rgba(248,166,163,.1);border:1px solid rgba(248,166,163,.24);color:var(--salmon);font-size:.6rem;margin-top:1px}\n.ct-name{font-size:1.02rem;line-height:1.33;margin-bottom:5px;color:var(--white)}\n.ct-desc{font-size:.775rem;line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}\n.ct-lang{color:var(--salmon)!important}\n</style>'


def inject_listing_design(doc, mobile=False):
    """Design layer for the blog listing pages (desktop index and mobile lists)."""
    css = MBLOG_CSS if mobile else DESIGN_CSS
    marker = 'id="mblog-design"' if mobile else 'id="blog-design"'
    tag = r'<style id="mblog-design">.*?</style>' if mobile else r'<style id="blog-design">.*?</style>'
    if marker in doc:
        doc = re.sub(tag, lambda m: css, doc, count=1, flags=re.S)
    else:
        doc = doc.replace('</head>', css + '\n</head>', 1)
    return fix_breadcrumb_seps(doc)
