#!/usr/bin/env python3
"""Sitemap regenerator with hreflang clusters + per-file git lastmod."""

import os, re, subprocess
from datetime import datetime, timezone

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(REPO)
DOMAIN = "https://sabdastudio.com"
TODAY = datetime.now(timezone.utc).strftime('%Y-%m-%d')

CLUSTERS = [
    ("/",                       "/es/",                   "/ca/"),
    ("/classes/",               "/es/clases/",            "/ca/classes/"),
    ("/pricing/",               "/es/precios/",           "/ca/preus/"),
    ("/schedule.html",          "",                       ""),
    ("/hire/",                  "/es/alquiler/",          "/ca/lloguer/"),
    ("/events/",                "/es/eventos/",           "/ca/esdeveniments/"),
    ("/about/",                 "/es/sobre/",             "/ca/sobre/"),
    ("/contact/",                "/es/contacto/",          "/ca/contacte/"),
    ("/faq/",                   "/es/faq/",               "/ca/faq/"),
    ("/intro/",                 "/es/intro/",             "/ca/intro/"),
    ("/reviews/",               "",                       ""),
    ("/team-building/",         "",                       ""),
    ("/experiencia-inmersiva/", "",                       ""),
    ("/blog/",                  "/es/blog/",              "/ca/blog/"),
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
        d = r.stdout.strip()
        return d if d else TODAY
    except Exception:
        return TODAY

def find_cluster(url_path):
    for en, es, ca in CLUSTERS:
        if url_path in (en, es, ca):
            return (en, es, ca)
    return (url_path, '', '')

with open('sitemap.xml') as f:
    raw = f.read()

url_pattern = re.compile(
  r'<url>\s*<loc>([^<]+)</loc>\s*<lastmod>[^<]+</lastmod>'
  r'\s*<changefreq>([^<]+)</changefreq>\s*<priority>([^<]+)</priority>'
  r'(?:\s*<xhtml:link[^>]*/>)*'  # tolerate any number of pre-existing hreflang links
  r'\s*</url>',
  re.IGNORECASE)

entries = [{'loc':m.group(1), 'changefreq':m.group(2), 'priority':m.group(3)}
           for m in url_pattern.finditer(raw)]
print(f"Read {len(entries)} URLs from existing sitemap")

out = ['<?xml version="1.0" encoding="UTF-8"?>',
       '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
       '        xmlns:xhtml="http://www.w3.org/1999/xhtml">']

dropped = []
hreflang_clusters = 0
total_hreflang_links = 0

for e in entries:
    url_path = e['loc'].replace(DOMAIN, '')
    fp = url_to_filepath(url_path)
    if not os.path.exists(fp):
        dropped.append((url_path, fp)); continue
    lastmod = git_lastmod(fp)
    en, es, ca = find_cluster(url_path)

    out.append('  <url>')
    out.append(f'    <loc>{e["loc"]}</loc>')
    out.append(f'    <lastmod>{lastmod}</lastmod>')
    out.append(f'    <changefreq>{e["changefreq"]}</changefreq>')
    out.append(f'    <priority>{e["priority"]}</priority>')

    alts = []
    if en and os.path.exists(url_to_filepath(en)): alts.append(('en', en))
    if es and os.path.exists(url_to_filepath(es)): alts.append(('es', es))
    if ca and os.path.exists(url_to_filepath(ca)): alts.append(('ca', ca))

    if len(alts) >= 2:
        hreflang_clusters += 1
        for hl, slug in alts:
            out.append(f'    <xhtml:link rel="alternate" hreflang="{hl}" href="{DOMAIN}{slug}"/>')
            total_hreflang_links += 1
        x_def = en if en and os.path.exists(url_to_filepath(en)) else alts[0][1]
        out.append(f'    <xhtml:link rel="alternate" hreflang="x-default" href="{DOMAIN}{x_def}"/>')
        total_hreflang_links += 1

    out.append('  </url>')

out.append('</urlset>')
with open('sitemap.xml','w') as f:
    f.write('\n'.join(out) + '\n')

print(f"Wrote {len(entries) - len(dropped)} URLs")
print(f"Hreflang clusters: {hreflang_clusters}, total hreflang links: {total_hreflang_links}")
if dropped:
    print(f"DROPPED {len(dropped)} entries (file does not exist):")
    for url, fp in dropped[:10]: print(f"  {url}  ->  {fp}")
