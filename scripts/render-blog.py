#!/usr/bin/env python3
"""
SABDA blog MD → HTML renderer.

Generates blog/SLUG/index.html from blog/article-NN-*.md
Matches the canonical template extracted from existing articles.

Usage:
    python3 scripts/render-blog.py blog/article-XX-*.md   # one article
    python3 scripts/render-blog.py --all                   # all 60
    python3 scripts/render-blog.py --check                 # dry-run, report what would render
"""
import sys, os, re, json, subprocess, glob, html
from pathlib import Path
from datetime import datetime

REPO = Path(__file__).resolve().parent.parent
os.chdir(REPO)

# ─── DEPS ───
try:
    import markdown
except ImportError:
    print('Installing markdown...')
    subprocess.run([sys.executable,'-m','pip','install','markdown','--quiet','--break-system-packages'])
    import markdown

# ─── HARDCODED LANGUAGE MAP ───
# Per inventory + body inspection 2026-04-13:
CA_ARTICLES = {3, 46, 60}
EN_ARTICLES = {1, 7, 12, 13, 14, 17, 30, 37, 38, 40, 41, 42, 43, 49, 50, 52, 54, 57, 59}
# All others are ES.

def detect_lang(article_num):
    if article_num in CA_ARTICLES: return 'ca'
    if article_num in EN_ARTICLES: return 'en'
    return 'es'

# ─── PER-ARTICLE HREFLANG MAP ───
# Cluster blog articles that are translations of each other.
# Each cluster is {lang: slug}. Articles not in any cluster are monolingual.
HREFLANG_CLUSTERS = [
    # NOTE: Only group articles here if they're TRUE TRANSLATIONS (same content,
    # different language). Grouping non-translations causes Google to canonicalize
    # them onto each other and de-index alternates. When in doubt, keep solo.
    
    # ── Things to do / weekend plans / today's plans ──
    # NOT translations: each targets a different keyword + scope (generic / weekend / today).
    # Different titles, counts, and word counts. Kept as 3 independent articles.
    {'en': '/blog/things-to-do-in-barcelona/'},
    {'es': '/blog/cosas-que-hacer-en-barcelona/'},
    {'ca': '/blog/que-fer-avui-barcelona/'},
    # Pilates Barcelona guide
    {'es': '/blog/pilates-barcelona-guia/'},
    # Yoga Barcelona guide
    {'es': '/blog/yoga-barcelona-guia/'},
    # Ice bath
    {'en': '/blog/ice-bath-barcelona/'},
    # Sound healing — true translation (same "What is..." pattern, near-identical scope)
    {'en': '/blog/what-is-sound-healing/',
     'es': '/blog/que-es-el-sound-healing/'},
    # Breathwork — true translation
    {'en': '/blog/what-is-breathwork/',
     'es': '/blog/que-es-el-breathwork/'},
    # Ecstatic dance — true translation
    {'en': '/blog/ecstatic-dance-barcelona/',
     'es': '/blog/ecstatic-dance-que-es/'},
    # ── Mindfulness ──
    # NOT translations: EN = generic ("Classes, Retreats, Where to Practice"),
    # ES = specifically courses ("Cursos: Formats, Prices, Where to Start").
    # Different KWs (mindfulness barcelona vs curso mindfulness barcelona).
    {'en': '/blog/mindfulness-barcelona/'},
    {'es': '/blog/curso-mindfulness-barcelona/'},
    # ── Immersive experiences ──
    # NOT translations: EN = "Best Immersive Experiences guide", ES = "Immersive
    # Exhibitions: The Science of Wellness per Neuroscience", CA = "Immersive
    # Wellness: Yoga, Pilates, Sound and Art in 360°". Three different topics
    # entirely. Different KWs each.
    {'en': '/blog/immersive-experiences-barcelona/'},
    {'es': '/blog/ciencia-bienestar-inmersivo/'},
    {'ca': '/blog/benestar-immersiu-barcelona/'},
    # Originals — true translation pair (ES↔CA, both "Original plans/activities not in any guide")
    {'es': '/blog/planes-originales-barcelona/',
     'ca': '/blog/activitats-originals-barcelona/'},
    # Couples — true translation
    {'en': '/blog/couples-activities-barcelona/',
     'es': '/blog/planes-en-pareja-barcelona/'},
    # Gift experiences — true translation
    {'en': '/blog/gift-experiences-barcelona/',
     'es': '/blog/regalo-experiencia-barcelona/'},
    # Hen party / Despedida (deprecated EN, ES live)
    {'es': '/blog/despedida-de-soltera-barcelona/'},
    # Team building / corporate — true translation
    {'en': '/blog/team-building-activities-barcelona/',
     'es': '/blog/actividades-para-empresas-barcelona/'},
    # First time — true translation
    {'en': '/blog/first-time-sabda/',
     'es': '/blog/primera-vez-sabda/'},
]

def get_hreflang_for_slug(slug):
    """Return {lang: slug} dict for the cluster containing this slug, or {} if mono."""
    for cluster in HREFLANG_CLUSTERS:
        if slug in cluster.values():
            return cluster
    return {}

# ─── CUSTOM FRONTMATTER PARSER ───
def parse_frontmatter(md_content):
    """Parse the SABDA frontmatter (markdown bold style, not YAML)."""
    fields = {}
    lines = md_content.split('\n')
    body_start_idx = 0
    
    # Read until first standalone '---' separator (after front-matter section)
    in_fm = True
    for i, line in enumerate(lines):
        # H1 line — extract as headline
        m = re.match(r'^# (.+?)$', line)
        if m and 'h1' not in fields:
            fields['h1'] = m.group(1).strip()
            continue
        # Bold-key:value pattern
        m = re.match(r'^\*\*([A-Za-z][^:]+?):\*\*\s*(.*?)$', line)
        if m:
            key = m.group(1).strip().lower().replace(' ', '_')
            val = m.group(2).strip()
            # Strip trailing backticks on slug values
            if val.startswith('`') and val.endswith('`'): val = val[1:-1]
            # Strip trailing length markers like (152 chars)
            val = re.sub(r'\s*\(\d+\s*chars?\)\s*$', '', val)
            fields[key] = val
            continue
        # Bool flags like '**noindex: true**'
        m = re.match(r'^\*\*([a-z_]+):\s*(true|false)\*\*\s*$', line)
        if m:
            fields[m.group(1)] = (m.group(2) == 'true')
            continue
        # First standalone '---' separator after fields → body starts after
        if line.strip() == '---' and len(fields) > 0:
            body_start_idx = i + 1
            break
    
    body = '\n'.join(lines[body_start_idx:]).strip()
    return fields, body

# ─── GIT DATES ───
def git_dates(filepath):
    """Return (datePublished, dateModified) as YYYY-MM-DD."""
    try:
        # First commit (added)
        r1 = subprocess.run(['git','log','--diff-filter=A','--format=%cs','--reverse','--',filepath],
                            capture_output=True, text=True, timeout=10)
        added = r1.stdout.strip().split('\n')[0] if r1.stdout.strip() else ''
        # Last commit (modified)
        r2 = subprocess.run(['git','log','-1','--format=%cs','--',filepath],
                            capture_output=True, text=True, timeout=10)
        modified = r2.stdout.strip()
    except Exception:
        added = modified = ''
    today = datetime.now().strftime('%Y-%m-%d')
    return (added or today, modified or today)

# ─── HTML ESCAPE ───
def esc(s):
    return html.escape(s, quote=True)

# ─── TEMPLATE ───
NAV_LABELS = {
    'en': {'classes':'Classes','pricing':'Pricing','hire':'Hire','events':'Events','about':'About','blog':'Blog','home':'Home','blog_home':'Blog'},
    'es': {'classes':'Clases','pricing':'Precios','hire':'Alquiler','events':'Eventos','about':'Sobre','blog':'Blog','home':'Inicio','blog_home':'Blog'},
    'ca': {'classes':'Classes','pricing':'Preus','hire':'Lloguer','events':'Esdeveniments','about':'Sobre','blog':'Blog','home':'Inici','blog_home':'Blog'},
}
NAV_PATHS = {
    'en': {'classes':'/classes/','pricing':'/pricing/','hire':'/hire/','events':'/events/','about':'/about/','blog':'/blog/'},
    'es': {'classes':'/es/clases/','pricing':'/es/precios/','hire':'/es/alquiler/','events':'/es/eventos/','about':'/es/sobre/','blog':'/blog/'},
    'ca': {'classes':'/ca/classes/','pricing':'/ca/preus/','hire':'/ca/lloguer/','events':'/ca/esdeveniments/','about':'/ca/sobre/','blog':'/blog/'},
}
LEGAL_PATHS = {
    'en': {'privacy':'/privacy-policy.html','terms':'/terms.html','cookies':'/cookies.html'},
    'es': {'privacy':'/es/legal/politica-privacidad.html','terms':'/es/legal/terminos.html','cookies':'/es/legal/cookies.html'},
    'ca': {'privacy':'/ca/legal/politica-privacitat.html','terms':'/ca/legal/termes.html','cookies':'/ca/legal/cookies.html'},
}
LEGAL_LABELS = {
    'en': {'privacy':'Privacy','terms':'Terms','cookies':'Cookies'},
    'es': {'privacy':'Privacidad','terms':'Términos','cookies':'Cookies'},
    'ca': {'privacy':'Privacitat','terms':'Termes','cookies':'Cookies'},
}
CTA_COPY = {
    'en': {'h':'Experience SABDA','p':'3 classes. Any type. 30 days. No commitment.','b':'3 Classes for €50'},
    'es': {'h':'Vive SABDA','p':'3 clases. Cualquier tipo. 30 días. Sin compromiso.','b':'3 Clases por €50'},
    'ca': {'h':'Viu SABDA','p':'3 classes. Qualsevol tipus. 30 dies. Sense compromís.','b':'3 Classes per €50'},
}
META_LABELS = {
    'en': 'SABDA · ',
    'es': 'SABDA · ',
    'ca': 'SABDA · ',
}
# Mobile menu extras (login + contact + about + legal items)
MOB_NAV_LABELS = {
    'en': {'login':'Log In','contact':'Contact','legal':'Legal Notice'},
    'es': {'login':'Iniciar sesión','contact':'Contacto','legal':'Aviso legal'},
    'ca': {'login':'Iniciar sessió','contact':'Contacte','legal':'Avís legal'},
}
MOB_NAV_PATHS = {
    'en': {'contact':'/contact/','legal':'/legal-notice.html'},
    'es': {'contact':'/es/contact/','legal':'/es/legal/aviso-legal.html'},
    'ca': {'contact':'/ca/contact/','legal':'/ca/legal/avis-legal.html'},
}
# Hero image used at the top of every article — same as the homepage hero.
ARTICLE_HERO_IMG = 'https://raw.githubusercontent.com/marv0611/sabdawebsite/main/intro-hero-desktop.jpg'
MONTH_NAMES = {
    'en': {1:'January',2:'February',3:'March',4:'April',5:'May',6:'June',7:'July',8:'August',9:'September',10:'October',11:'November',12:'December'},
    'es': {1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre'},
    'ca': {1:'Gener',2:'Febrer',3:'Març',4:'Abril',5:'Maig',6:'Juny',7:'Juliol',8:'Agost',9:'Setembre',10:'Octubre',11:'Novembre',12:'Desembre'},
}

def render_html(md_path, dry_run=False):
    """Render one MD file to HTML. Returns (output_path, html_content)."""
    md_content = open(md_path).read()
    fields, body = parse_frontmatter(md_content)
    
    # Article number
    m = re.search(r'article-(\d+)-', md_path)
    art_num = int(m.group(1)) if m else 0
    
    lang = detect_lang(art_num)
    
    # Required fields
    h1 = fields.get('h1', '').strip()
    if not h1:
        return None, f'No H1 in {md_path}'
    slug = fields.get('slug', '').rstrip('/') + '/'
    if not slug.startswith('/blog/'):
        return None, f'Bad/missing slug in {md_path}: {slug!r}'
    meta_desc = fields.get('meta_description', '').strip()
    primary_kw = fields.get('primary_keyword', '').strip()
    
    # Strip [DEPRECATED] prefix from H1 for cleaner display (deprecation stubs)
    h1_clean = re.sub(r'^\[[A-Z]+\]\s*', '', h1).strip()
    
    # Output path
    out_dir = REPO / slug.strip('/')
    out_path = out_dir / 'index.html'
    
    # Detect noindex flag (from frontmatter or [DEPRECATED] marker)
    is_noindex = bool(fields.get('noindex')) or '[DEPRECATED]' in h1
    
    # ─── Strip editorial annotations that should never render ───
    # Author breadcrumbs like *[hreflang: ...]*, *[Schema: ...]*, *[Images needed: ...]*,
    # *[CTA routes to ...]*, *[All images require alt text...]*, *[Deprecated: ...]*.
    # Pattern: a whole line that's italic-wrapped (asterisk) brackets. All 122 instances
    # across 60 MDs are editorial — none are content. Hreflang `<link>` tags + JSON-LD
    # schema are emitted programmatically below.
    body = re.sub(r'^\s*\*\[[^\]]+\]\*?\s*$\n?', '', body, flags=re.MULTILINE)
    
    # ─── Markdown → HTML ───
    md = markdown.Markdown(extensions=['extra','sane_lists','attr_list'])
    body_html = md.convert(body)
    
    # ─── Get git-derived dates ───
    date_pub, date_mod = git_dates(md_path)
    
    # ─── Date formatting for article-meta line ───
    try:
        dt = datetime.strptime(date_mod, '%Y-%m-%d')
        month_name = MONTH_NAMES[lang][dt.month]
        date_display = f'{month_name} {dt.year}'
    except Exception:
        date_display = ''
    
    # ─── hreflang block ───
    cluster = get_hreflang_for_slug(slug)
    hreflang_html = ''
    if cluster:
        for hl, slug_in_cluster in cluster.items():
            hreflang_html += f'<link rel="alternate" hreflang="{hl}" href="https://sabdastudio.com{slug_in_cluster}">\n'
        # x-default points to EN if exists, else first
        xdef = cluster.get('en') or list(cluster.values())[0]
        hreflang_html += f'<link rel="alternate" hreflang="x-default" href="https://sabdastudio.com{xdef}">\n'
    else:
        # Self-reference for monolingual
        hreflang_html = f'<link rel="alternate" hreflang="{lang}" href="https://sabdastudio.com{slug}">\n<link rel="alternate" hreflang="x-default" href="https://sabdastudio.com{slug}">\n'
    
    # ─── Lang switcher: build from cluster (point to translations only if they exist) ───
    lang_switcher_html = ''
    for code in ['en','es','ca']:
        if cluster and code in cluster:
            href = cluster[code]
            active = ' class="active"' if code == lang else ''
            lang_switcher_html += f'<a href="{href}"{active}>{code.upper()}</a>'
        elif code == lang:
            # Active monolingual
            lang_switcher_html += f'<a href="{slug}" class="active">{code.upper()}</a>'
        else:
            # Fallback: lang root
            root = {'en':'/','es':'/es/','ca':'/ca/'}[code]
            lang_switcher_html += f'<a href="{root}">{code.upper()}</a>'
    
    # ─── Schema (BlogPosting) ───
    schema_blogposting = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        'headline': h1_clean,
        'description': meta_desc,
        'author': {'@type':'Organization','name':'SABDA','url':'https://sabdastudio.com'},
        'publisher': {'@type':'Organization','name':'SABDA','url':'https://sabdastudio.com',
                       'logo':{'@type':'ImageObject','url':'https://sabdastudio.com/favicons/icon-512.png'}},
        'datePublished': date_pub,
        'dateModified': date_mod,
        'mainEntityOfPage': {'@type':'WebPage','@id':f'https://sabdastudio.com{slug}'},
        'inLanguage': lang,
        'image': 'https://raw.githubusercontent.com/marv0611/sabdawebsite/main/Copy_of_Sabda2-167__1_.jpg',
    }
    
    # Breadcrumb schema
    schema_breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type':'ListItem','position':1,'name':NAV_LABELS[lang]['home'],'item':'https://sabdastudio.com/'},
            {'@type':'ListItem','position':2,'name':NAV_LABELS[lang]['blog'],'item':'https://sabdastudio.com/blog/'},
            {'@type':'ListItem','position':3,'name':h1_clean,'item':f'https://sabdastudio.com{slug}'},
        ]
    }
    
    # ─── Robots meta ───
    # SAFE DEFAULT: noindex unless MD explicitly opts in via **publish: true**
    # This prevents accidentally pushing all articles live at once.
    is_published = bool(fields.get('publish', False))
    if is_noindex:
        robots_meta = '<meta name="robots" content="noindex,follow">'
    elif is_published:
        robots_meta = '<meta name="robots" content="index,follow,max-image-preview:large">'
    else:
        # Default: not yet released
        robots_meta = '<meta name="robots" content="noindex,follow">'
    
    # ─── Title (with " | SABDA" suffix) ───
    title_full = f'{h1_clean} | SABDA'
    
    # ─── Social image ───
    social_img = 'https://raw.githubusercontent.com/marv0611/sabdawebsite/main/Copy_of_Sabda2-167__1_.jpg'
    
    # ─── Nav + Footer paths for this lang ───
    np = NAV_PATHS[lang]
    nl = NAV_LABELS[lang]
    lp = LEGAL_PATHS[lang]
    ll = LEGAL_LABELS[lang]
    cta = CTA_COPY[lang]
    mob = MOB_NAV_LABELS[lang]
    mnp = MOB_NAV_PATHS[lang]
    
    # ─── Assemble HTML ───
    out = f'''<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="facebook-domain-verification" content="6vs8q2dkkemv5umuqn9irqnpippo3u">
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{{if(f.fbq)return;n=f.fbq=function(){{n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)}};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '567636669734630', {{}});
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=567636669734630&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->
<meta name="generator" content="SABDA Renderer v1">
{robots_meta}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title_full)}</title>
<meta name="description" content="{esc(meta_desc)}">
<link rel="canonical" href="https://sabdastudio.com{slug}">
<meta property="og:title" content="{esc(title_full)}">
<meta property="og:description" content="{esc(meta_desc)}">
<meta property="og:url" content="https://sabdastudio.com{slug}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="SABDA">
<meta property="og:image" content="{social_img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@sabda_studio">
<meta name="twitter:title" content="{esc(title_full)}">
<meta name="twitter:description" content="{esc(meta_desc)}">
<meta name="twitter:image" content="{social_img}">
<script type="application/ld+json">
{json.dumps(schema_blogposting, ensure_ascii=False, indent=2)}
</script>
<script type="application/ld+json">
{json.dumps(schema_breadcrumb, ensure_ascii=False, indent=2)}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=PT+Serif:ital,wght@0,400;0,700;1,400;1,700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
:root{{--navy:#0e1235;--salmon:#F8A6A3;--cyan:#02F3C5;--white:#f0efe9;--white60:rgba(240,239,233,.72);--white38:rgba(240,239,233,.55);--ease-expo:cubic-bezier(.16,1,.3,1)}}
*,*::before,*::after{{margin:0;padding:0;box-sizing:border-box}}html{{scroll-behavior:smooth}}
body{{background:var(--navy);color:var(--white);font-family:'DM Sans',sans-serif;font-weight:400;line-height:1.6;overflow-x:hidden;-webkit-font-smoothing:antialiased}}
a{{color:inherit;text-decoration:none}}img{{display:block;max-width:100%;height:auto}}::selection{{background:rgba(248,166,163,.18)}}
.grain{{position:fixed;inset:0;pointer-events:none;z-index:9000;opacity:.038;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='512' height='512'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:200px}}
nav{{display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:72px;position:fixed;top:0;left:0;right:0;z-index:100;transition:background .4s,border-color .4s;border-bottom:1px solid transparent}}nav.scrolled{{background:rgba(14,18,53,.92);backdrop-filter:blur(18px);border-color:rgba(240,239,233,.06)}}
.nav-logo img{{height:22px;width:auto;object-fit:contain}}.nav-links{{display:flex;gap:36px;list-style:none}}.nav-links a{{font-size:.82rem;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--white60);transition:color .25s}}.nav-links a:hover{{color:var(--white)}}.nav-right{{display:flex;align-items:center;gap:18px}}.lang-sel{{display:flex;gap:2px;border-left:1px solid rgba(240,239,233,.08);padding-left:18px}}.lang-sel a{{padding:4px 7px;font-size:.68rem;font-weight:600;letter-spacing:.08em;color:var(--white38);border-radius:3px;transition:color .2s,background .2s}}.lang-sel a.active{{color:var(--cyan);opacity:1;background:rgba(2,243,197,.08)}}.nav-social{{display:flex;gap:14px;padding-left:14px;border-left:1px solid rgba(240,239,233,.08)}}.nav-social a{{display:flex}}.nav-social svg{{width:17px;height:17px;fill:rgba(240,239,233,.55);transition:fill .25s}}.nav-social a:hover svg{{fill:var(--white)}}
.nav-login{{padding-left:14px;border-left:1px solid rgba(240,239,233,.08)}}.nav-login a{{display:inline-flex;align-items:center;gap:6px;font-size:.78rem;font-weight:500;color:var(--white60);transition:color .25s}}.nav-login a:hover{{color:var(--white)}}.nav-login svg{{width:14px;height:14px;fill:none;stroke:currentColor}}
.nav-ham{{display:none;flex-direction:column;gap:4px;padding:12px;cursor:pointer;z-index:101;background:none;border:none}}.nav-ham span{{width:20px;height:1.5px;background:var(--white);transition:transform .3s,opacity .3s}}
.mob-menu{{position:fixed;inset:0;z-index:99;background:rgba(14,18,53,.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;opacity:0;pointer-events:none;transition:opacity .35s}}.mob-menu.open{{opacity:1;pointer-events:auto}}.mob-menu a{{font-family:'PT Serif',serif;font-size:1.6rem;font-weight:700;color:var(--white);opacity:.85;transition:opacity .2s,color .2s}}.mob-menu a:hover{{opacity:1;color:var(--cyan)}}.mob-close{{position:absolute;top:24px;right:24px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:none;border:none}}.mob-close svg{{width:24px;height:24px;stroke:var(--white);stroke-width:2}}
.hero-banner{{position:relative;width:100%;height:320px;overflow:hidden;margin-top:72px}}
.hero-banner img{{width:100%;height:100%;object-fit:cover;object-position:center 40%;filter:brightness(.55) contrast(1.1) saturate(1.15)}}
.hero-banner::after{{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,rgba(14,18,53,.3) 0%,rgba(14,18,53,.12) 40%,rgba(14,18,53,.7) 80%,var(--navy) 100%)}}
.hero-overlay{{position:absolute;bottom:44px;left:0;right:0;z-index:3;text-align:center;padding:0 24px}}
.hero-overlay .hero-eyebrow{{font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;color:var(--cyan);margin-bottom:10px;font-weight:500}}
.hero-overlay h1{{font-family:'PT Serif',serif;font-size:clamp(1.8rem,4vw,2.8rem);font-weight:700;letter-spacing:-.015em;line-height:1.15;margin:0 auto;max-width:900px}}
.breadcrumbs{{padding:0 80px;margin-top:24px;position:relative;z-index:3;font-size:.75rem;color:rgba(240,239,233,.65)}}.breadcrumbs a{{color:var(--white60);transition:color .2s}}.breadcrumbs a:hover{{color:var(--cyan)}}
.article{{padding:32px 80px 100px;max-width:800px;margin:0 auto;position:relative;z-index:2}}
.article h1{{display:none}}
.article-meta{{font-size:.8rem;color:var(--white38);margin-bottom:36px;letter-spacing:.04em}}
.article h2{{font-family:'PT Serif',serif;font-size:clamp(1.3rem,2.5vw,1.8rem);font-weight:700;letter-spacing:-.015em;margin:48px 0 20px;color:var(--white)}}
.article h3{{font-family:'PT Serif',serif;font-size:1.2rem;font-weight:700;margin:36px 0 14px;color:var(--white)}}
.article p{{font-size:1.05rem;line-height:1.75;color:var(--white60);margin-bottom:24px}}
.article ul,.article ol{{margin:0 0 24px 24px;color:var(--white60)}}.article li{{font-size:1rem;line-height:1.7;margin-bottom:8px}}
.article a{{color:var(--cyan);border-bottom:1px solid rgba(2,243,197,.3);padding-bottom:1px;transition:border-color .25s}}.article a:hover{{border-color:var(--cyan)}}
.article strong{{color:var(--white);font-weight:600}}
.article em{{font-style:italic}}
.article blockquote{{border-left:3px solid var(--cyan);padding:16px 24px;margin:24px 0;background:rgba(2,243,197,.03);border-radius:0 8px 8px 0}}.article blockquote p{{margin:0;color:var(--white60)}}
.article hr{{border:none;height:1px;background:rgba(240,239,233,.06);margin:48px 0}}
.article-cta{{text-align:center;padding:48px 0;margin-top:48px;border-top:1px solid rgba(240,239,233,.06)}}
.article-cta h3{{font-family:'PT Serif',serif;font-size:1.5rem;margin-bottom:12px}}
.article-cta p{{color:var(--white60);margin-bottom:24px}}
.btn-p{{display:inline-flex;align-items:center;gap:10px;background:var(--cyan);color:var(--navy);padding:14px 28px;border-radius:4px;font-size:.85rem;font-weight:700;letter-spacing:.04em;transition:background .25s,transform .25s;border-bottom:none!important}}.btn-p:hover{{background:#00ddb0;transform:translateY(-1px)}}
footer{{padding:52px 80px 30px;border-top:1px solid rgba(240,239,233,.07);background:rgba(9,12,38,.6);position:relative;z-index:2}}.ft-in{{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:48px;max-width:1140px;margin:0 auto}}.ft-brand img:first-child{{height:36px;width:auto;margin-bottom:16px;display:block;margin-right:auto}}.ft-pillars{{display:flex;gap:12px;margin-top:14px;font-size:.82rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(240,239,233,.65)}}.fp-art{{color:var(--salmon)}}.fp-tech{{color:var(--cyan)}}.fp-well{{color:var(--white)}}.ft-symbol{{width:200px!important;height:auto!important;margin-top:28px;opacity:.35;display:block;object-fit:contain;max-width:200px}}.ft-col h4{{font-size:.68rem;letter-spacing:.22em;text-transform:uppercase;color:var(--white38);margin-bottom:18px;font-weight:600}}.ft-col ul{{list-style:none;margin:0;padding:0}}.ft-col li{{margin-bottom:10px}}.ft-col a{{font-size:.85rem;color:var(--white60);transition:color .2s;border-bottom:none}}.ft-col a:hover{{color:var(--white)}}.ft-bot{{display:flex;justify-content:space-between;align-items:center;margin-top:40px;padding-top:24px;border-top:1px solid rgba(240,239,233,.05);font-size:.72rem;color:rgba(240,239,233,.65)}}.ft-legal{{display:flex;gap:20px}}.ft-legal a{{color:var(--white38);transition:color .2s;border-bottom:none}}.ft-legal a:hover{{color:var(--white)}}
@media(max-width:860px){{nav{{padding:0 24px}}.nav-links{{display:none}}.nav-social,.nav-login{{display:none}}.lang-sel a{{padding:4px 5px;font-size:.65rem}}.nav-ham{{display:flex}}.hero-banner{{height:240px;margin-top:64px}}.hero-overlay{{bottom:30px}}.breadcrumbs{{padding:0 24px;margin-top:18px;font-size:.7rem}}.article{{padding:24px 24px 72px}}footer{{padding-left:24px;padding-right:24px}}.ft-in{{grid-template-columns:1fr 1fr}}}}
@media(max-width:520px){{.ft-in{{grid-template-columns:1fr}}.hero-banner{{height:200px}}.hero-overlay h1{{font-size:1.55rem}}.hero-overlay .hero-eyebrow{{font-size:.65rem;letter-spacing:.18em}}}}
.kit-digital-bar{{display:flex;align-items:center;justify-content:center;gap:20px;padding:16px 24px;margin-top:4px}}
.kit-digital-bar img{{height:36px;width:auto;opacity:.85}}
@media(max-width:600px){{.kit-digital-bar{{flex-wrap:wrap;gap:12px}}.kit-digital-bar img{{height:28px}}}}
.ft-legal a{{color:rgba(240,239,233,.65) !important}}
.ft-legal{{color:rgba(240,239,233,.65) !important}}
.rn-ct{{color:rgba(240,239,233,.70) !important}}
.nav-links a{{color:rgba(240,239,233,.75)}}
.ft-bot{{color:rgba(240,239,233,.65)}}
</style>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-1E1WXTZWQD"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag("js",new Date());gtag("config","G-1E1WXTZWQD",{{"anonymize_ip":true}});</script>
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){{
        c[a]=c[a]||function(){{(c[a].q=c[a].q||[]).push(arguments)}};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    }})(window, document, "clarity", "script", "waoyd1cczc");
</script>
{hreflang_html.rstrip()}
<link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
</head>
<body>
<div class="grain"></div>
<nav id="nav">
 <a href="/" class="nav-logo" aria-label="SABDA - Home">
 <img src="https://raw.githubusercontent.com/marv0611/sabdawebsite/main/SABDA%20white%20logo.png" alt="SABDA" width="400" height="127">
 </a>
 <ul class="nav-links">
 <li><a href="{np['classes']}">{nl['classes']}</a></li>
 <li><a href="{np['pricing']}">{nl['pricing']}</a></li>
 <li><a href="{np['hire']}">{nl['hire']}</a></li>
 <li><a href="{np['events']}">{nl['events']}</a></li>
 </ul>
 <div class="nav-right">
 <div class="lang-sel">
 {lang_switcher_html}
 </div>
 <div class="nav-social">
 <a href="https://instagram.com/sabda_studio" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24"><path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 1.5A4 4 0 0 0 3.5 7.5v9a4 4 0 0 0 4 4h9a4 4 0 0 0 4-4v-9a4 4 0 0 0-4-4h-9zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm5.25-2.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg></a>
 <a href="https://www.tiktok.com/@sabda_studio" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><svg viewBox="0 0 24 24"><path d="M16.6 5.82A4.28 4.28 0 0 1 13.8 3h-3v12.4a2.6 2.6 0 0 1-2.6 2.6 2.6 2.6 0 0 1-2.6-2.6A2.6 2.6 0 0 1 8.2 12.8c.28 0 .56.04.82.12V9.84A5.6 5.6 0 0 0 2.6 15.4a5.6 5.6 0 0 0 5.6 5.6 5.6 5.6 0 0 0 5.6-5.6V9.72a7.3 7.3 0 0 0 4.2 1.32V8.02a4.28 4.28 0 0 1-1.4-2.2z"/></svg></a>
 </div>
 <div class="nav-login">
 <a href="https://momence.com/sign-in" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>{mob['login']}</a>
 </div>
 </div>
<button class="nav-ham" onclick="document.getElementById('mobMenu').classList.add('open')" aria-label="Menu"><span></span><span></span><span></span></button></nav>
<div class="mob-menu" id="mobMenu"><button class="mob-close" type="button" aria-label="Close menu" onclick="this.parentElement.classList.remove('open')"><svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12"/></svg></button><a href="{np['classes']}">{nl['classes']}</a><a href="{np['pricing']}">{nl['pricing']}</a><a href="{np['hire']}">{nl['hire']}</a><a href="{np['events']}">{nl['events']}</a><a href="/blog/">{nl['blog']}</a><a href="{np['about']}">{nl['about']}</a><a href="{mnp['contact']}">{mob['contact']}</a><a href="https://momence.com/sign-in" target="_blank" rel="noopener noreferrer">{mob['login']}</a><div style="width:60px;height:1px;background:rgba(240,239,233,.12);margin:4px 0"></div><a href="{mnp['legal']}" style="font-size:.9rem;font-weight:500;opacity:.6">{mob['legal']}</a><a href="{lp['privacy']}" style="font-size:.9rem;font-weight:500;opacity:.6">{ll['privacy']}</a><a href="{lp['terms']}" style="font-size:.9rem;font-weight:500;opacity:.6">{ll['terms']}</a><a href="{lp['cookies']}" style="font-size:.9rem;font-weight:500;opacity:.6">{ll['cookies']}</a></div>

<div class="hero-banner">
  <img src="{ARTICLE_HERO_IMG}" alt="SABDA immersive wellness studio Barcelona">
  <div class="hero-overlay">
    <div class="hero-eyebrow">{nl['blog']}</div>
    <h1>{esc(h1_clean)}</h1>
  </div>
</div>
<nav aria-label="Breadcrumb" class="breadcrumbs"><a href="/">{nl['home']}</a> / <a href="/blog/">{nl['blog']}</a> / <span>{esc(h1_clean)}</span></nav>
<article class="article">
 <h1>{esc(h1_clean)}</h1>
 <div class="article-meta">SABDA &middot; {date_display}</div>
{body_html}
 <div class="article-cta">
 <h3>{cta['h']}</h3>
 <p>{cta['p']}</p>
 <a href="https://momence.com/m/443935" class="btn-p" target="_blank" rel="noopener noreferrer">{cta['b']}</a>
 </div>
</article>
<footer style="border-top:1px solid rgba(240,239,233,.07)">
 <div class="ft-in">
 <div class="ft-brand">
 <img src="https://raw.githubusercontent.com/marv0611/sabdawebsite/main/SABDA%20white%20logo.png" alt="SABDA" width="400" height="127">
 <div class="ft-pillars"><span class="fp-art">Art</span><span>·</span><span class="fp-tech">Tech</span><span>·</span><span class="fp-well">Wellness</span></div>
 <img class="ft-symbol" src="https://raw.githubusercontent.com/marv0611/sabdawebsite/main/SABDA%20symbol%20multi-colored%20(1).png" alt="SABDA symbol">
 </div>
 <div class="ft-col"><h3 style="color:var(--cyan)">{nl['classes']}</h3><ul>
 <li><a href="{np['classes']}">{nl['classes']}</a></li><li><a href="{np['hire']}">{nl['hire']}</a></li><li><a href="{np['pricing']}">{nl['pricing']}</a></li><li><a href="{np['events']}">{nl['events']}</a></li><li><a href="{np['about']}">{nl['about']}</a></li><li><a href="/blog/">Blog</a></li>
 </ul></div>
 <div class="ft-col"><h3 style="color:var(--salmon)">Connect</h3><ul>
 <li><a href="https://instagram.com/sabda_studio" target="_blank" rel="noopener noreferrer">Instagram</a></li>
 <li><a href="https://www.tiktok.com/@sabda_studio" target="_blank" rel="noopener noreferrer">TikTok</a></li>
 <li><a href="https://www.linkedin.com/company/sabdastudio" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
 </ul></div>
 <div class="ft-col"><h3 style="color:var(--white)">Contact</h3><ul>
 <li><a href="mailto:info@sabdastudio.com">info@sabdastudio.com</a></li>
 <li><a href="tel:+34625449878">+34 625 44 98 78</a></li>
 <li><a href="https://maps.google.com/?q=SABDA+Studio,+Barcelona" target="_blank" rel="noopener noreferrer" style="color:var(--cyan);border-bottom:1px solid rgba(2,243,197,.3);padding-bottom:2px;transition:border-color .25s">Get Directions →</a></li>
 </ul></div>
 </div>
 <div class="ft-bot">
 <span>© 2026 SABDA STUDIO S.L. All rights reserved.</span>
 <div class="ft-legal"><a href="{lp['privacy']}">{ll['privacy']}</a><a href="{lp['terms']}">{ll['terms']}</a><a href="{lp['cookies']}">{ll['cookies']}</a></div>
 </div>
<div class="kit-digital-bar" aria-label="Financiado por el Programa Kit Digital">
 <img src="/logos-kit-digital.jpg" alt="Financiado por la Unión Europea NextGenerationEU · Gobierno de España · Plan de Recuperación, Transformación y Resiliencia · Kit Digital" loading="lazy" width="800" height="100">
</div>
</footer>
<script>
const nav=document.getElementById('nav');window.addEventListener('scroll',()=>{{nav.classList.toggle('scrolled',scrollY>40)}},{{passive:true}});
</script>
</body>
</html>'''
    
    if dry_run:
        return out_path, out
    
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path.write_text(out)
    return out_path, None

# ─── CLI ───
if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    
    if sys.argv[1] == '--all':
        files = sorted(glob.glob('blog/article-*.md'))
    elif sys.argv[1] == '--check':
        files = sorted(glob.glob('blog/article-*.md'))
        for f in files:
            out_path, content = render_html(f, dry_run=True)
            if content and 'No H1' in content:
                print(f'  ERR {f}: {content}')
            else:
                print(f'  OK  {f} → {out_path}')
        sys.exit(0)
    else:
        files = sys.argv[1:]
    
    rendered = 0
    errors = []
    for f in files:
        try:
            out_path, err = render_html(f)
            if err:
                errors.append(f'{f}: {err}'); continue
            rendered += 1
            print(f'  ✓ {out_path}')
        except Exception as e:
            errors.append(f'{f}: {type(e).__name__}: {e}')
            import traceback; traceback.print_exc()
    
    print(f'\nRendered: {rendered}/{len(files)}')
    if errors:
        print(f'Errors:')
        for e in errors: print(f'  {e}')
        sys.exit(1)
