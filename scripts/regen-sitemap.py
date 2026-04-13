#!/usr/bin/env python3
"""
SABDA sitemap regenerator v2 — disk-driven discovery.

What changed vs v1:
  v1 read existing sitemap and re-emitted only what was already there. New
  blog HTMLs were never added.

  v2 (this version):
    1. Walks disk to discover all canonical pages (nav + legal + class + blog)
    2. Merges with hreflang clusters for proper alternate links
    3. Emits per-file lastmod from git
    4. Includes ALL blog/*/index.html files — no manual updates needed when
       new articles are rendered

Output: sitemap.xml at repo root.
"""

import os, re, glob, subprocess
from datetime import datetime, timezone

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(REPO)
DOMAIN = "https://sabdastudio.com"
TODAY = datetime.now(timezone.utc).strftime('%Y-%m-%d')

# ─── NAV/LEGAL/CLASS hreflang clusters ───
# Each tuple: (en_path, es_path, ca_path) — empty string if no translation.
NAV_CLUSTERS = [
    ("/",                       "/es/",                   "/ca/"),
    ("/classes/",               "/es/clases/",            "/ca/classes/"),
    ("/pricing/",               "/es/precios/",           "/ca/preus/"),
    ("/schedule.html",          "",                       ""),
    ("/hire/",                  "/es/alquiler/",          "/ca/lloguer/"),
    ("/events/",                "/es/eventos/",           "/ca/esdeveniments/"),
    ("/about/",                 "/es/sobre/",             "/ca/sobre/"),
    ("/contact/",               "/es/contacto/",          "/ca/contacte/"),
    ("/faq/",                   "/es/faq/",               "/ca/faq/"),
    ("/intro/",                 "/es/intro/",             "/ca/intro/"),
    ("/reviews/",               "",                       ""),
    ("/team-building/",         "",                       ""),
    ("/experiencia-inmersiva/", "",                       ""),
    ("/blog/",                  "",                       ""),
    ("/classes/yoga/",          "/es/clases/yoga/",          "/ca/classes/yoga/"),
    ("/classes/pilates/",       "/es/clases/pilates/",       "/ca/classes/pilates/"),
    ("/classes/sound-healing/", "/es/clases/sound-healing/", "/ca/classes/sound-healing/"),
    ("/classes/breathwork/",    "/es/clases/breathwork/",    "/ca/classes/breathwork/"),
    ("/classes/ecstatic-dance/","/es/clases/ecstatic-dance/","/ca/classes/ecstatic-dance/"),
    ("/classes/ice-bath/",      "/es/clases/ice-bath/",      "/ca/classes/ice-bath/"),
    ("/privacy-policy.html",    "/es/legal/politica-privacidad.html", "/ca/legal/politica-privacitat.html"),
    ("/terms.html",             "/es/legal/terminos.html",            "/ca/legal/termes.html"),
    ("/cookies.html",           "/es/legal/cookies.html",             "/ca/legal/cookies.html"),
    ("/legal-notice.html",      "/es/legal/aviso-legal.html",         "/ca/legal/avis-legal.html"),
]

# ─── BLOG hreflang clusters (must mirror render-blog.py) ───
BLOG_CLUSTERS = [
    {'en': '/blog/things-to-do-in-barcelona/',
     'es': '/blog/cosas-que-hacer-en-barcelona/',
     'ca': '/blog/que-fer-avui-barcelona/'},
    {'en': '/blog/what-is-sound-healing/',
     'es': '/blog/que-es-el-sound-healing/'},
    {'en': '/blog/what-is-breathwork/',
     'es': '/blog/que-es-el-breathwork/'},
    {'en': '/blog/ecstatic-dance-barcelona/',
     'es': '/blog/ecstatic-dance-que-es/'},
    {'en': '/blog/mindfulness-barcelona/',
     'es': '/blog/curso-mindfulness-barcelona/'},
    {'en': '/blog/immersive-experiences-barcelona/',
     'es': '/blog/ciencia-bienestar-inmersivo/',
     'ca': '/blog/benestar-immersiu-barcelona/'},
    {'es': '/blog/planes-originales-barcelona/',
     'ca': '/blog/activitats-originals-barcelona/'},
    {'en': '/blog/couples-activities-barcelona/',
     'es': '/blog/planes-en-pareja-barcelona/'},
    {'en': '/blog/gift-experiences-barcelona/',
     'es': '/blog/regalo-experiencia-barcelona/'},
    {'en': '/blog/team-building-activities-barcelona/',
     'es': '/blog/actividades-para-empresas-barcelona/'},
    {'en': '/blog/first-time-sabda/',
     'es': '/blog/primera-vez-sabda/'},
]

# Articles excluded from sitemap (deprecated/noindex).
# Detected by checking source MD for [DEPRECATED] or **noindex: true**.
def get_blog_excludes():
    excluded_slugs = set()
    for md in glob.glob('blog/article-*.md'):
        s = open(md).read()
        if '[DEPRECATED]' in s or '**noindex: true**' in s:
            m = re.search(r'\*\*Slug:\*\*\s*`?(/blog/[^`\s]+)`?', s)
            if m:
                slug = m.group(1).rstrip('/') + '/'
                excluded_slugs.add(slug)
    return excluded_slugs

EXCLUDED_BLOG = get_blog_excludes()

def url_to_filepath(url_path):
    p = url_path.strip('/')
    if p == '': return 'index.html'
    if p.endswith('.html'): return p
    for c in [f"{p}/index.html", f"{p}.html"]:
        if os.path.exists(c): return c
    return f"{p}/index.html"

def git_lastmod(filepath):
    try:
        r = subprocess.run(['git','log','-1','--format=%cs','--',filepath],
                          capture_output=True, text=True, timeout=10)
        return r.stdout.strip() or TODAY
    except Exception:
        return TODAY

def html_priority(url_path):
    if url_path in ('/', '/es/', '/ca/'): return '1.0'
    if url_path == '/intro/' or url_path.endswith('/intro/'): return '0.9'
    if url_path.startswith('/blog/') and url_path != '/blog/': return '0.7'
    return '0.8'

def html_changefreq(url_path):
    if url_path == '/' or url_path == '/es/' or url_path == '/ca/': return 'weekly'
    if url_path.startswith('/blog/'): return 'monthly'
    return 'monthly'

def render_url_entry(loc_path, cluster_dict=None):
    """
    cluster_dict: {lang: path} for hreflang annotations. None for monolingual.
    """
    full_loc = DOMAIN + loc_path
    fp = url_to_filepath(loc_path)
    lastmod = git_lastmod(fp)
    cf = html_changefreq(loc_path)
    pr = html_priority(loc_path)
    parts = [
        '  <url>',
        f'    <loc>{full_loc}</loc>',
        f'    <lastmod>{lastmod}</lastmod>',
        f'    <changefreq>{cf}</changefreq>',
        f'    <priority>{pr}</priority>',
    ]
    if cluster_dict:
        for hl, p in cluster_dict.items():
            if p:
                parts.append(f'    <xhtml:link rel="alternate" hreflang="{hl}" href="{DOMAIN}{p}"/>')
        # x-default: prefer EN, else first available
        xdef = cluster_dict.get('en') or next(iter(cluster_dict.values()))
        parts.append(f'    <xhtml:link rel="alternate" hreflang="x-default" href="{DOMAIN}{xdef}"/>')
    parts.append('  </url>')
    return '\n'.join(parts)

# ─── BUILD ───
out = ['<?xml version="1.0" encoding="UTF-8"?>',
       '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
       '        xmlns:xhtml="http://www.w3.org/1999/xhtml">']

emitted_paths = set()
hreflang_link_count = 0
cluster_count = 0
dropped = []

# ─── 1. NAV/LEGAL/CLASS clusters ───
for en, es, ca in NAV_CLUSTERS:
    cluster = {}
    for code, p in [('en', en), ('es', es), ('ca', ca)]:
        if not p: continue
        fp = url_to_filepath(p)
        if not os.path.exists(fp):
            dropped.append((code, p, fp))
            continue
        cluster[code] = p
    if not cluster: continue
    cluster_count += 1
    for code, p in cluster.items():
        if p in emitted_paths: continue
        emitted_paths.add(p)
        out.append(render_url_entry(p, cluster_dict=cluster))
        hreflang_link_count += len(cluster) + 1  # +1 for x-default

# ─── 2. BLOG: per-cluster + standalone ───
# Build slug-to-cluster lookup
blog_slug_to_cluster = {}
for c in BLOG_CLUSTERS:
    for slug in c.values():
        blog_slug_to_cluster[slug] = c

# Discover ALL blog HTMLs on disk
blog_htmls = sorted(glob.glob('blog/*/index.html'))
blog_slugs = []
for fp in blog_htmls:
    slug = '/' + fp.replace('/index.html', '/').lstrip('./')
    blog_slugs.append(slug)

# Filter: skip excluded (deprecated/noindex) + skip the blog hub (already in nav)
skipped_excluded = []
for slug in blog_slugs:
    if slug in EXCLUDED_BLOG:
        skipped_excluded.append(slug)
        continue
    if slug == '/blog/':  # hub already in NAV_CLUSTERS
        continue
    if slug in emitted_paths: continue
    
    cluster = blog_slug_to_cluster.get(slug)
    if cluster:
        # Filter cluster to only existing slugs
        valid_cluster = {}
        for code, p in cluster.items():
            if os.path.exists(url_to_filepath(p)):
                valid_cluster[code] = p
        if valid_cluster and slug in valid_cluster.values():
            out.append(render_url_entry(slug, cluster_dict=valid_cluster))
            hreflang_link_count += len(valid_cluster) + 1
            cluster_count += 1
            emitted_paths.add(slug)
            continue
    
    # Monolingual blog post
    out.append(render_url_entry(slug, cluster_dict=None))
    emitted_paths.add(slug)

out.append('</urlset>')

with open('sitemap.xml', 'w') as f:
    f.write('\n'.join(out) + '\n')

# ─── REPORT ───
print(f'Sitemap regenerated: {len(emitted_paths)} URLs')
print(f'  Clusters with hreflang: {cluster_count}')
print(f'  Total hreflang annotations: {hreflang_link_count}')
print(f'  Blog HTMLs discovered on disk: {len(blog_htmls)}')
print(f'  Blog excluded (noindex/deprecated): {len(skipped_excluded)}')
for s in skipped_excluded[:10]: print(f'    skipped: {s}')
if dropped:
    print(f'  Dropped (file missing on disk): {len(dropped)}')
    for code, p, fp in dropped[:5]: print(f'    {code} {p} → {fp}')
