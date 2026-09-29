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
sys.path.insert(0, str(Path(__file__).resolve().parent))
import blog_enhance

CA_ARTICLES = {3, 46, 60}

# ─── CANONICAL TRACKING / CONSENT BLOCKS ───
# Kept verbatim so rendered articles match the rest of the site: consent gating
# (GA4 Consent Mode v2, Pixel revoke, Clarity on demand) plus Momence passthrough.
PIXEL_BLOCK = '<script>\n!function(f,b,e,v,n,t,s)\n{if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};\nif(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version=\'2.0\';\nn.queue=[];t=b.createElement(e);t.async=!0;\nt.src=v;s=b.getElementsByTagName(e)[0];\ns.parentNode.insertBefore(t,s)}(window, document,\'script\',\n\'https://connect.facebook.net/en_US/fbevents.js\');\n(function(){var m=false;try{var c=JSON.parse(localStorage.getItem(\'sabda_cookie_consent\')||\'null\');m=!!(c&&c.marketing);}catch(e){}if(!m&&typeof fbq===\'function\'){fbq(\'consent\',\'revoke\');}})();\nfbq(\'init\', \'567636669734630\', {});\nfbq(\'track\', \'PageView\');\n/* SABDA-MOMENCE-PASSTHROUGH-v2 */\n;(function(){\n  if (window._sabdaPassthroughInstalled) return;\n  window._sabdaPassthroughInstalled = true;\n  var PRODUCTS = {\n    \'443934\':{name:\'Trial Drop-in\',value:18,ct:\'trial\'},\n    \'443935\':{name:\'Intro 3-Pack\',value:50,ct:\'pack\'},\n    \'445630\':{name:\'Drop-in\',value:22,ct:\'dropin\'},\n    \'443937\':{name:\'5-Pack\',value:85,ct:\'pack\'},\n    \'443939\':{name:\'10-Pack\',value:149,ct:\'pack\'},\n    \'443641\':{name:\'BCN 1-Week Unlimited\',value:50,ct:\'trial\'},\n    \'706876\':{name:\'Flex\',value:99,ct:\'membership\'},\n    \'709976\':{name:\'Ritual\',value:109,ct:\'membership\'},\n    \'431216\':{name:\'Immerse\',value:130,ct:\'membership\'},\n    \'445600\':{name:\'Immerse 3-Month\',value:330,ct:\'membership\'},\n    \'507726\':{name:\'Ice Bath Drop-in\',value:12,ct:\'ice\'},\n    \'507728\':{name:\'Ice Bath 3-Pack\',value:30,ct:\'ice\'},\n    \'507729\':{name:\'Ice Bath 5-Pack\',value:40,ct:\'ice\'}\n  };\n  var TK = [\'fbclid\',\'gclid\',\'ttclid\',\'msclkid\',\'li_fat_id\',\'utm_source\',\'utm_medium\',\'utm_campaign\',\'utm_content\',\'utm_term\'];\n  function collect(){\n    var out={};\n    try {\n      var sp=new URLSearchParams(window.location.search);\n      TK.forEach(function(k){var v=sp.get(k);if(v)out[k]=v;});\n      if (typeof window._sabdaGetAttribution===\'function\') {\n        var st=window._sabdaGetAttribution()||{};\n        TK.forEach(function(k){if(!out[k]&&st[k])out[k]=st[k];});\n      }\n    } catch(e){}\n    return out;\n  }\n  function append(href, params){\n    try {\n      var u=new URL(href, window.location.origin);\n      Object.keys(params).forEach(function(k){\n        if (!u.searchParams.has(k)) u.searchParams.set(k, params[k]);\n      });\n      return u.toString();\n    } catch(e){ return href; }\n  }\n  function packId(href){ try{ var m=href.match(/momence\\.com\\/m\\/(\\d+)/i); return m?m[1]:null; }catch(e){return null;} }\n  document.addEventListener(\'click\', function(ev){\n    try {\n      var a = ev.target && ev.target.closest ? ev.target.closest(\'a[href*="momence.com"]\') : null;\n      if (!a) return;\n      var href = a.getAttribute(\'href\');\n      if (!href) return;\n      a.setAttribute(\'target\', \'_self\');  /* TEST-A v2: same-tab nav */\n      var params = collect();\n      if (Object.keys(params).length > 0) {\n        a.setAttribute(\'href\', append(href, params));\n      }\n      var pid = packId(href);\n      if (pid && PRODUCTS[pid] && typeof window.fbq === \'function\') {\n        var p = PRODUCTS[pid];\n        try {\n          window.fbq(\'track\',\'InitiateCheckout\',{\n            content_ids:[pid], content_name:p.name, content_type:p.ct,\n            value:p.value, currency:\'EUR\'\n          });\n        } catch(e){}\n      }\n    } catch(e){}\n  }, true);\n})();\n\n</script>'
GA4_CONSENT = "<script>/* SABDA consent gate: Google Consent Mode v2 defaults, read from stored consent */\nwindow.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}\n(function(){var a='denied',m='denied';try{var c=JSON.parse(localStorage.getItem('sabda_cookie_consent')||'null');if(c){a=c.analytics?'granted':'denied';m=c.marketing?'granted':'denied';}}catch(e){}\ngtag('consent','default',{ad_storage:m,ad_user_data:m,ad_personalization:m,analytics_storage:a,functionality_storage:'granted',security_storage:'granted',wait_for_update:500});})();</script>"
CLARITY_GATED = '<script type="text/javascript">\n/* SABDA consent gate: Microsoft Clarity loads only with analytics consent */\nwindow.SABDAloadClarity=function(){\n  if(window.__sabdaClarityLoaded)return;window.__sabdaClarityLoaded=true;\n  (function(c,l,a,r,i,t,y){\n    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};\n    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;\n    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);\n  })(window, document, "clarity", "script", "waoyd1cczc");\n};\n(function(){try{var c=JSON.parse(localStorage.getItem(\'sabda_cookie_consent\')||\'null\');if(c&&c.analytics)window.SABDAloadClarity();}catch(e){}})();\n</script>'
CSS_BLOCK = '<style>\n:root{--navy:#0e1235;--salmon:#F8A6A3;--cyan:#02F3C5;--white:#f0efe9;--white60:rgba(240,239,233,.72);--white38:rgba(240,239,233,.55);--ease-expo:cubic-bezier(.16,1,.3,1);--safe-t:env(safe-area-inset-top,0px);--safe-b:env(safe-area-inset-bottom,0px)}\n*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}\nbody{background:var(--navy);color:var(--white);font-family:\'DM Sans\',sans-serif;font-weight:400;line-height:1.6;overflow-x:hidden;-webkit-font-smoothing:antialiased}\na{color:inherit;text-decoration:none}img{display:block;max-width:100%;height:auto}::selection{background:rgba(248,166,163,.18)}\n.grain{position:fixed;inset:0;pointer-events:none;z-index:9000;opacity:.038;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'512\' height=\'512\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E");background-size:200px}\nnav{display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:72px;position:fixed;top:0;left:0;right:0;z-index:100;transition:background .4s,border-color .4s;border-bottom:1px solid transparent}nav.scrolled{background:rgba(14,18,53,.92);backdrop-filter:blur(18px);border-color:rgba(240,239,233,.06)}\n.nav-logo img{height:22px;width:auto;object-fit:contain}.nav-links{display:flex;gap:36px;list-style:none}.nav-links a{font-size:.82rem;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--white60);transition:color .25s}.nav-links a:hover{color:var(--white)}.nav-right{display:flex;align-items:center;gap:18px}.lang-sel{display:flex;gap:2px;border-left:1px solid rgba(240,239,233,.08);padding-left:18px}.lang-sel a{padding:4px 7px;font-size:.68rem;font-weight:600;letter-spacing:.08em;color:var(--white38);border-radius:3px;transition:color .2s,background .2s}.lang-sel a.active{color:var(--cyan);opacity:1;background:rgba(2,243,197,.08)}.nav-social{display:flex;gap:14px;padding-left:14px;border-left:1px solid rgba(240,239,233,.08)}.nav-social a{display:flex}.nav-social svg{width:17px;height:17px;fill:rgba(240,239,233,.55);transition:fill .25s}.nav-social a:hover svg{fill:var(--white)}\n.nav-login{padding-left:14px;border-left:1px solid rgba(240,239,233,.08)}.nav-login a{display:inline-flex;align-items:center;gap:6px;font-size:.78rem;font-weight:500;color:var(--white60);transition:color .25s}.nav-login a:hover{color:var(--white)}.nav-login svg{width:14px;height:14px;fill:none;stroke:currentColor}\n.nav-book{padding:8px 18px;background:var(--cyan);color:var(--navy);border-radius:100px;font-size:.78rem;font-weight:700;letter-spacing:.02em;margin-left:14px;white-space:nowrap;transition:background .2s,transform .2s;box-shadow:0 2px 12px rgba(2,243,197,.2)}.nav-book:hover{background:#00ddb0;transform:translateY(-1px)}\n.nav-ham{display:none;flex-direction:column;gap:4px;padding:12px;cursor:pointer;z-index:101;background:none;border:none}.nav-ham span{width:20px;height:1.5px;background:var(--white);transition:transform .3s,opacity .3s}\n.mob-menu{position:fixed;inset:0;z-index:200;background:rgba(14,18,53,.98);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:22px;padding:88px 24px 40px;overflow-y:auto;-webkit-overflow-scrolling:touch;opacity:0;pointer-events:none;transition:opacity .35s}.mob-menu.open{opacity:1;pointer-events:auto}.mob-menu a{font-family:\'PT Serif\',serif;font-size:1.6rem;font-weight:700;color:var(--white);opacity:.85;transition:opacity .2s,color .2s}.mob-menu a:hover{opacity:1;color:var(--cyan)}.mob-close{position:absolute;top:24px;right:24px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:none;border:none;z-index:201}.mob-close svg{width:24px;height:24px;stroke:var(--white);stroke-width:2}\n.hero-banner{position:relative;width:100%;height:320px;overflow:hidden;margin-top:72px}\n.hero-banner img{width:100%;height:100%;object-fit:cover;object-position:center 40%;filter:brightness(.55) contrast(1.1) saturate(1.15)}\n.hero-banner::after{content:\'\';position:absolute;inset:0;background:linear-gradient(to bottom,rgba(14,18,53,.3) 0%,rgba(14,18,53,.12) 40%,rgba(14,18,53,.7) 80%,var(--navy) 100%)}\n.hero-overlay{position:absolute;bottom:44px;left:0;right:0;z-index:3;text-align:center;padding:0 24px}\n.hero-overlay .hero-eyebrow{font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;color:var(--cyan);margin-bottom:10px;font-weight:500}\n.hero-overlay h1{font-family:\'PT Serif\',serif;font-size:clamp(1.8rem,4vw,2.8rem);font-weight:700;letter-spacing:-.015em;line-height:1.15;margin:0 auto;max-width:900px}\n.breadcrumbs{padding:0 80px;margin:24px auto 0;max-width:960px;position:relative;z-index:3;font-size:.75rem;color:rgba(240,239,233,.65);display:flex;gap:8px;align-items:center;flex-wrap:wrap}.breadcrumbs a{color:var(--white60);transition:color .2s}.breadcrumbs a:hover{color:var(--cyan)}\n.article{padding:32px 80px 100px;max-width:800px;margin:0 auto;position:relative;z-index:2}\n.article h1{display:none}\n.article-meta{font-size:.8rem;color:var(--white38);margin-bottom:36px;letter-spacing:.04em}\n.article h2{font-family:\'PT Serif\',serif;font-size:clamp(1.3rem,2.5vw,1.8rem);font-weight:700;letter-spacing:-.015em;margin:48px 0 20px;color:var(--white)}\n.article h3{font-family:\'PT Serif\',serif;font-size:1.2rem;font-weight:700;margin:36px 0 14px;color:var(--white)}\n.article p{font-size:1.05rem;line-height:1.75;color:var(--white60);margin-bottom:24px}\n.article ul,.article ol{margin:0 0 24px 24px;color:var(--white60)}.article li{font-size:1rem;line-height:1.7;margin-bottom:8px}\n.article a{color:var(--cyan);border-bottom:1px solid rgba(2,243,197,.3);padding-bottom:1px;transition:border-color .25s}.article a:hover{border-color:var(--cyan)}\n.article strong{color:var(--white);font-weight:600}\n.article em{font-style:italic}\n.article blockquote{border-left:3px solid var(--cyan);padding:16px 24px;margin:24px 0;background:rgba(2,243,197,.03);border-radius:0 8px 8px 0}.article blockquote p{margin:0;color:var(--white60)}\n.article hr{border:none;height:1px;background:rgba(240,239,233,.06);margin:48px 0}\n.btn-p{display:inline-flex;align-items:center;justify-content:center;gap:10px;background:var(--cyan);color:var(--navy);padding:16px 36px;border-radius:100px;font-size:.88rem;font-weight:700;letter-spacing:.02em;transition:background .25s,transform .25s;border-bottom:none!important;box-shadow:0 6px 28px rgba(2,243,197,.22);position:relative;overflow:hidden}.btn-p:hover{background:#00ddb0;transform:translateY(-1px)}\n.btn-p::after{content:\'\';position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.12) 50%,transparent 60%);transform:translateX(-100%);animation:shimmer 3s ease infinite 2s}\n@keyframes shimmer{0%{transform:translateX(-100%)}30%{transform:translateX(100%)}100%{transform:translateX(100%)}}\nfooter{padding:52px 80px 30px;border-top:1px solid rgba(240,239,233,.07);background:rgba(9,12,38,.6);position:relative;z-index:2}.ft-in{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:48px;max-width:1140px;margin:0 auto}.ft-brand img:first-child{height:36px;width:auto;margin-bottom:16px;display:block;margin-right:auto}.ft-pillars{display:flex;gap:12px;margin-top:14px;font-size:.82rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(240,239,233,.65)}.fp-art{color:var(--salmon)}.fp-tech{color:var(--cyan)}.fp-well{color:var(--white)}.ft-symbol{width:200px!important;height:auto!important;margin-top:28px;opacity:.35;display:block;object-fit:contain;max-width:200px}.ft-col h4{font-size:.68rem;letter-spacing:.22em;text-transform:uppercase;color:var(--white38);margin-bottom:18px;font-weight:600}.ft-col ul{list-style:none;margin:0;padding:0}.ft-col li{margin-bottom:10px}.ft-col a{font-size:.85rem;color:var(--white60);transition:color .2s;border-bottom:none}.ft-col a:hover{color:var(--white)}.ft-bot{display:flex;justify-content:space-between;align-items:center;margin-top:40px;padding-top:24px;border-top:1px solid rgba(240,239,233,.05);font-size:.72rem;color:rgba(240,239,233,.65)}.ft-legal{display:flex;gap:20px}.ft-legal a{color:var(--white38);transition:color .2s;border-bottom:none}.ft-legal a:hover{color:var(--white)}\n@media(max-width:860px){nav{padding:0 20px;padding-top:var(--safe-t);height:calc(52px + var(--safe-t));background:rgba(14,18,53,.92);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid rgba(240,239,233,.06)}.nav-links{display:none}.nav-social,.nav-login{display:none}.lang-sel{display:none}.nav-right{display:none}.nav-ham{display:flex}.nav-book{display:inline-flex;margin-left:auto;margin-right:12px}.hero-banner{height:320px;margin-top:calc(52px + var(--safe-t))}.hero-overlay{bottom:28px}.breadcrumbs{padding:0 20px;margin-top:12px;font-size:.68rem}.article{padding:16px 20px 72px}.article-meta{margin-bottom:20px}footer{padding-left:24px;padding-right:24px}.ft-in{grid-template-columns:1fr 1fr}}\n@media(max-width:520px){.ft-in{grid-template-columns:1fr}.hero-banner{height:280px}.hero-overlay h1{font-size:1.45rem}.hero-overlay .hero-eyebrow{font-size:.62rem;letter-spacing:.18em}}\n.kit-digital-bar{display:flex;align-items:center;justify-content:center;gap:20px;padding:16px 24px;margin-top:4px}\n.kit-digital-bar img{height:36px;width:auto;opacity:.85}\n@media(max-width:600px){.kit-digital-bar{flex-wrap:wrap;gap:12px}.kit-digital-bar img{height:28px}}\n.ft-legal a{color:rgba(240,239,233,.65) !important}\n.ft-legal{color:rgba(240,239,233,.65) !important}\n.rn-ct{color:rgba(240,239,233,.70) !important}\n.nav-links a{color:rgba(240,239,233,.75)}\n.ft-bot{color:rgba(240,239,233,.65)}\n\n/* MOBILE HERO TREATMENT, revision */\n@media(max-width:860px){.hero-banner img{filter:brightness(.35) contrast(1.1) saturate(1.3)}.hero-banner::after{background:linear-gradient(to bottom,rgba(14,18,53,.18) 0%,rgba(14,18,53,.05) 30%,rgba(14,18,53,.55) 80%,var(--navy) 100%)}.hero-banner{height:auto;min-height:46svh}.hero-overlay{position:absolute;bottom:22px;padding:0 24px}.hero-overlay h1{font-family:\'PT Serif\',serif;font-size:clamp(1.5rem,5vw,1.85rem);font-weight:700;letter-spacing:-.015em;line-height:1.18;max-width:100%;margin:0 auto}.hero-overlay .hero-eyebrow{font-size:.62rem;letter-spacing:.2em;margin-bottom:8px}}@media(max-width:520px){.hero-banner{min-height:42svh}.hero-overlay{bottom:18px;padding:0 20px}.hero-overlay h1{font-size:1.35rem;line-height:1.18}.hero-overlay .hero-eyebrow{font-size:.58rem;margin-bottom:6px}}\n\n/* MOBILE TAB BAR, revision */.tabs{display:none}@media(max-width:860px){footer{display:none}.tabs{position:fixed;top:auto;bottom:0;left:0;right:0;z-index:100;display:flex;align-items:flex-end;justify-content:space-around;height:calc(72px + env(safe-area-inset-bottom,0px));padding-bottom:env(safe-area-inset-bottom,0px);background:rgba(14,18,53,.95);backdrop-filter:saturate(1.4) blur(24px);-webkit-backdrop-filter:saturate(1.4) blur(24px);border-top:1px solid rgba(240,239,233,.06)}.tab{display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 0 6px;flex:1;color:rgba(240,239,233,.65);transition:color .2s;text-decoration:none}.tab.on{color:var(--cyan)}.tab svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.tab span{font-size:.5rem;letter-spacing:.04em;font-weight:600}.tab-bk{position:relative}.tab-bk-o{width:56px;height:56px;border-radius:50%;background:var(--cyan);display:flex;align-items:center;justify-content:center;position:relative;top:-10px;box-shadow:0 4px 24px rgba(2,243,197,.28)}.tab-bk-o svg{stroke:var(--navy);width:22px;height:22px;stroke-width:2.5}.tab-bk span{position:relative;top:-6px}body{padding-bottom:84px}}\n</style>'

EN_ARTICLES = {1, 7, 12, 13, 14, 17, 30, 37, 38, 40, 41, 42, 43, 49, 50, 52, 54, 57, 59}
# All others are ES.

# blog-release-queue.json carries an explicit lang per article. Prefer it, so new
# articles do not silently fall through to the ES default the way 61-68 did.
def _queue_langs():
    try:
        q = json.load(open(REPO/'blog-release-queue.json', encoding='utf-8'))
        items = q if isinstance(q, list) else (q.get('queue') or q.get('articles') or [])
        return {int(i['art_num']): i['lang'] for i in items if i.get('art_num') and i.get('lang')}
    except Exception:
        return {}
QUEUE_LANGS = _queue_langs()

def detect_lang(article_num):
    if article_num in QUEUE_LANGS: return QUEUE_LANGS[article_num]
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
    # ── Exhibition launch batch (articles 76 to 88) ──
    # Only these three are genuine translation pairs. The rest of the batch
    # targets a different keyword per language and stays monolingual.
    {'es': '/blog/exposiciones-barcelona-octubre/',
     'en': '/blog/barcelona-exhibitions-october/'},
    {'en': '/blog/digital-art-barcelona/',
     'es': '/blog/arte-digital-barcelona/'},
    {'es': '/blog/exposiciones-barcelona-noviembre/',
     'en': '/blog/barcelona-exhibitions-november/'},
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
    """Return (datePublished, dateModified) as YYYY-MM-DD.
    Fallback used only if the slug is not in blog-release-queue.json.
    """
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


# ─── RELEASE QUEUE DATES ───
# render-blog.py MUST consult the release queue for datePublished, otherwise
# re-renders clobber dates that blog-release.py has correctly stamped on
# release day (root cause of the Apr 20 date-regression bug).
_queue_cache = None
def _load_queue():
    global _queue_cache
    if _queue_cache is not None:
        return _queue_cache
    try:
        path = os.path.join(os.path.dirname(__file__), '..', 'blog-release-queue.json')
        with open(path) as f:
            data = json.load(f)
        # Index by slug for O(1) lookup. Slugs in the queue are '/blog/foo/'.
        _queue_cache = {a['slug']: a for a in data.get('queue', [])}
    except Exception as e:
        print(f'  ⚠ Could not load blog-release-queue.json: {e}')
        _queue_cache = {}
    return _queue_cache

def _queue_dates_for_slug(slug):
    """Return (datePublished, dateModified) from queue for a given slug, or
    ('', '') if not in queue. Called from render_article() for every article.

    Rules:
    - status:released  → datePublished = released_at, dateModified = today
    - status:queued    → datePublished = release_date (future), dateModified = today
    - not in queue     → caller falls back to git_dates()

    dateModified is always today — whenever we re-render, that counts as a
    modification for schema purposes.
    """
    q = _load_queue()
    a = q.get(slug)
    if not a:
        return ('', '')
    today = datetime.now().strftime('%Y-%m-%d')
    if a.get('status') == 'released' and a.get('released_at'):
        return (a['released_at'], today)
    if a.get('release_date'):
        return (a['release_date'], today)
    return ('', '')

# ─── HTML ESCAPE ───
def esc(s):
    return html.escape(s, quote=True)

# ─── TEMPLATE ───
NAV_LABELS = {
    'en': {'classes':'Classes','pricing':'Pricing','hire':'Hire','events':'Events','about':'About','blog':'Blog','home':'Home','blog_home':'Blog','book':'Book a Class'},
    'es': {'classes':'Clases','pricing':'Precios','hire':'Alquiler','events':'Eventos','about':'Sobre','blog':'Blog','home':'Inicio','blog_home':'Blog','book':'Reservar'},
    'ca': {'classes':'Classes','pricing':'Preus','hire':'Lloguer','events':'Esdeveniments','about':'Sobre','blog':'Blog','home':'Inici','blog_home':'Blog','book':'Reservar'},
}
NAV_PATHS = {
    'en': {'classes':'/classes/','pricing':'/pricing/','hire':'/hire/','events':'/events/','about':'/about/','blog':'/blog/','book':'/classes/','ice':'/classes/ice-bath/','celebrations':'/celebrations/'},
    'es': {'classes':'/es/clases/','pricing':'/es/precios/','hire':'/es/alquiler/','events':'/es/eventos/','about':'/es/sobre/','blog':'/blog/','book':'/es/clases/','ice':'/es/clases/ice-bath/','celebrations':'/es/celebraciones/'},
    'ca': {'classes':'/ca/classes/','pricing':'/ca/preus/','hire':'/ca/lloguer/','events':'/ca/esdeveniments/','about':'/ca/sobre/','blog':'/blog/','book':'/ca/classes/','ice':'/ca/classes/ice-bath/','celebrations':'/ca/celebracions/'},
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
TABS_BLOCK = {'en': {'tabs': '<div class="tabs"><a href="/classes/" class="tab"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>Classes</span></a><a href="/m/schedule.html" class="tab"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>Schedule</span></a><a href="/m/schedule.html" class="tab tab-bk"><div class="tab-bk-o"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div><span>Book</span></a><a href="/pricing.html" class="tab"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><span>Pricing</span></a><button class="tab" type="button" aria-label="Menu" onclick="document.getElementById(\'mobMenu\').classList.add(\'open\')"><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/></svg><span>More</span></button></div>\n', 'nav': '<li><a href="/classes/">Classes</a></li><li><a href="/classes/ice-bath/">Ice Bath</a></li>\n <li><a href="/pricing/">Pricing</a></li>\n <li><a href="/hire/">Hire</a></li>\n <li><a href="/events/">Events</a></li>', 'ft': ''}, 'es': {'tabs': '<div class="tabs"><a href="/es/clases/" class="tab"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>Clases</span></a><a href="/es/m/schedule.html" class="tab"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>Horario</span></a><a href="/es/m/schedule.html" class="tab tab-bk"><div class="tab-bk-o"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div><span>Reservar</span></a><a href="/es/precios/" class="tab"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><span>Precios</span></a><button class="tab" type="button" aria-label="Menú" onclick="document.getElementById(\'mobMenu\').classList.add(\'open\')"><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/></svg><span>Más</span></button></div>\n', 'nav': '<li><a href="/es/clases/">Clases</a></li><li><a href="/classes/ice-bath/">Ice Bath</a></li>\n <li><a href="/es/precios/">Precios</a></li>\n <li><a href="/es/alquiler/">Alquiler</a></li>\n <li><a href="/es/eventos/">Eventos</a></li>', 'ft': ''}, 'ca': {'tabs': '<div class="tabs"><a href="/ca/classes/" class="tab"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>Classes</span></a><a href="/ca/m/schedule.html" class="tab"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>Horari</span></a><a href="/ca/m/schedule.html" class="tab tab-bk"><div class="tab-bk-o"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div><span>Reservar</span></a><a href="/ca/preus/" class="tab"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><span>Preus</span></a><button class="tab" type="button" aria-label="Menú" onclick="document.getElementById(\'mobMenu\').classList.add(\'open\')"><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/></svg><span>Més</span></button></div>\n', 'nav': '<li><a href="/ca/classes/">Classes</a></li><li><a href="/classes/ice-bath/">Ice Bath</a></li>\n <li><a href="/ca/preus/">Preus</a></li>\n <li><a href="/ca/lloguer/">Lloguer</a></li>\n <li><a href="/ca/esdeveniments/">Esdeveniments</a></li>', 'ft': ''}}
CELEB_LABELS = {'en':'Celebrations','es':'Celebraciones','ca':'Celebracions'}

MOB_NAV_PATHS = {
    'en': {'contact':'/contact/','legal':'/legal-notice.html'},
    'es': {'contact':'/es/contacto/','legal':'/es/legal/aviso-legal.html'},
    'ca': {'contact':'/ca/contacte/','legal':'/ca/legal/avis-legal.html'},
}
# Hero image used at the top of every article — same as the homepage hero.
ARTICLE_HERO_IMG = 'https://raw.githubusercontent.com/marv0611/sabdawebsite/main/intro-hero-desktop.jpg'
MONTH_NAMES = {
    'en': {1:'January',2:'February',3:'March',4:'April',5:'May',6:'June',7:'July',8:'August',9:'September',10:'October',11:'November',12:'December'},
    'es': {1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre'},
    'ca': {1:'Gener',2:'Febrer',3:'Març',4:'Abril',5:'Maig',6:'Juny',7:'Juliol',8:'Agost',9:'Setembre',10:'Octubre',11:'Novembre',12:'Desembre'},
    'fr': {1:'Janvier',2:'Février',3:'Mars',4:'Avril',5:'Mai',6:'Juin',7:'Juillet',8:'Août',9:'Septembre',10:'Octobre',11:'Novembre',12:'Décembre'},
}

# ─── FRENCH ───
# The site has no /fr/ section, so French articles use the English chrome: nav,
# tabs, footer and legal all point at pages that exist. French appears where it
# belongs to the article itself: the html lang attribute (queue-driven), the
# month on the meta line, and the CTA copy. If a /fr/ site ever ships, replace
# these aliases with real French paths.
for _d in (NAV_LABELS, NAV_PATHS, LEGAL_PATHS, LEGAL_LABELS, MOB_NAV_LABELS, MOB_NAV_PATHS):
    _d['fr'] = _d['en']
TABS_BLOCK['fr'] = TABS_BLOCK['en']
CELEB_LABELS['fr'] = CELEB_LABELS['en']
CTA_COPY['fr'] = {'h':'Découvrez SABDA','p':'3 cours. Tous types. 30 jours. Sans engagement.','b':'3 cours pour 50€'}
META_LABELS['fr'] = META_LABELS['en']

# ─── TEMPLATE-DRIVEN RENDER ───
# The old renderer rebuilt every page from hardcoded constants. Those constants
# drifted from the live site, so each re-render silently reverted: the OpenAI
# pixel, the opt-out consent default (SABDA_CONSENT_DEFAULT), the Momence
# load-time decorateAll tagging, the Netlify badge-hide style, own-domain image
# URLs, Person authorship and the visible byline.
#
# It now copies a live article of the same language and swaps only the
# per-article fields, so chrome can never drift again. To adopt a chrome change,
# ship it to the reference article and re-render.
REFERENCE = {
    'es': 'blog/espectaculos-barcelona/index.html',
    'en': 'blog/best-yoga-studios-barcelona/index.html',
    'ca': 'blog/benestar-immersiu-barcelona/index.html',
    'fr': 'blog/expositions-immersives-barcelone/index.html',
}

# Markers that must survive every render. Checked after each page is built.
REQUIRED_MARKERS = [
    ('openai pixel',      'w.oaiq'),
    ('consent default',   'SABDA_CONSENT_DEFAULT'),
    ('momence decorate',  'function decorateAll'),
    ('clarity gate',      'SABDAloadClarity'),
    ('meta pixel',        'fbq('),
    ('netlify badge fix', 'nl-badge-hide'),
    ('author person',     '"@type": "Person"'),
    ('byline',            'linkedin.com/in/marvynhalfon'),
]

MONTHS = {
    'es': ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
           'septiembre','octubre','noviembre','diciembre'],
    'ca': ['gener','febrer','març','abril','maig','juny','juliol','agost',
           'setembre','octubre','novembre','desembre'],
    'fr': ['janvier','février','mars','avril','mai','juin','juillet','août',
           'septembre','octobre','novembre','décembre'],
    'en': ['January','February','March','April','May','June','July','August',
           'September','October','November','December'],
}

def _display_date(iso, lang):
    y, m, d = (int(x) for x in iso.split('-'))
    name = MONTHS.get(lang, MONTHS['en'])[m - 1]
    if lang == 'en':
        return f'{name} {d}, {y}'
    return f'{d} {name} {y}'

def _sub1(doc, pattern, repl, label, flags=0):
    """Replace exactly once. Raising here is deliberate: a silent miss is how
    the old renderer shipped pages with the wrong title or a stale date."""
    new, n = re.subn(pattern, lambda _m: repl, doc, count=1, flags=flags)
    if n != 1:
        raise RuntimeError(f'render: could not substitute {label} '
                           f'(matched {n} times, expected 1)')
    return new

def _hreflang_block(slug, lang):
    cluster = get_hreflang_for_slug(slug)
    D = 'https://sabdastudio.com'
    if not cluster or len(cluster) <= 1:
        # Fall back to the article's own language, never a hardcoded 'en':
        # that mislabelled every monolingual Spanish article as English.
        pairs = [(next(iter(cluster), None) or lang, slug)]
    else:
        pairs = sorted(cluster.items())
    lines = [f'<link rel="alternate" hreflang="{l}" href="{D}{s}">' for l, s in pairs]
    default = dict(pairs).get('en') or pairs[0][1]
    lines.append(f'<link rel="alternate" hreflang="x-default" href="{D}{default}">')
    return '\n'.join(lines)


def render_html(md_path, dry_run=False):
    md_path = str(md_path)
    raw = Path(md_path).read_text(encoding='utf-8')
    fields, body_md = parse_frontmatter(raw)

    m = re.search(r'article-(\d+)', md_path)
    art_num = int(m.group(1)) if m else 0
    lang = detect_lang(art_num)
    if lang not in REFERENCE:
        raise RuntimeError(f'{md_path}: no reference article for language {lang!r}')

    h1 = re.sub(r'^\[[A-Z]+\]\s*', '', fields.get('h1', '').strip()).strip()
    if not h1:
        raise RuntimeError(f'{md_path}: no H1')
    slug = fields.get('slug', '').strip()
    if not slug.startswith('/blog/'):
        raise RuntimeError(f'{md_path}: bad or missing slug {slug!r}')
    # Articles written since the Priority 1 rewrites carry an explicit Meta
    # title and own their whole <title>. Older ones have none, and the legacy
    # renderer appended " | SABDA", so keep doing that for them rather than
    # silently rewriting the title of every old article on re-render.
    title = (fields.get('meta_title') or f'{h1} | SABDA').strip()
    desc = (fields.get('meta_description') or '').strip()
    url = 'https://sabdastudio.com' + slug

    pub, mod = _queue_dates_for_slug(slug)
    if not pub:
        pub, mod = git_dates(md_path)
    # A queued article has not been modified since it was written, so its
    # dateModified is its publication date, not the day it happened to render.
    q = _load_queue().get(slug) or {}
    if q.get('status') != 'released':
        mod = pub
    noindex = bool(fields.get('noindex')) or q.get('status') != 'released'

    if dry_run:
        return (f'{slug} [{lang}] noindex={noindex} pub={pub}', None)

    doc = Path(REFERENCE[lang]).read_text(encoding='utf-8')
    ref_slug = re.search(r'<link rel="canonical" href="https://sabdastudio\.com([^"]+)"', doc).group(1)

    # ── head ──
    doc = _sub1(doc, r'<title>[^<]*</title>', f'<title>{esc(title)}</title>', 'title')
    doc = _sub1(doc, r'<meta name="description" content="[^"]*">',
                f'<meta name="description" content="{esc(desc)}">', 'description')
    doc = _sub1(doc, r'<meta name="robots" content="[^"]*">',
                '<meta name="robots" content="noindex,nofollow">' if noindex
                else '<meta name="robots" content="index,follow,max-image-preview:large">', 'robots')
    doc = _sub1(doc, r'<link rel="canonical" href="[^"]*">',
                f'<link rel="canonical" href="{url}">', 'canonical')
    doc = _sub1(doc, r'<meta property="og:title" content="[^"]*">',
                f'<meta property="og:title" content="{esc(title)}">', 'og:title')
    doc = _sub1(doc, r'<meta property="og:description" content="[^"]*">',
                f'<meta property="og:description" content="{esc(desc)}">', 'og:description')
    doc = _sub1(doc, r'<meta property="og:url" content="[^"]*">',
                f'<meta property="og:url" content="{url}">', 'og:url')
    doc = _sub1(doc, r'<meta name="twitter:title" content="[^"]*">',
                f'<meta name="twitter:title" content="{esc(title)}">', 'twitter:title')
    doc = _sub1(doc, r'<meta name="twitter:description" content="[^"]*">',
                f'<meta name="twitter:description" content="{esc(desc)}">', 'twitter:description')

    # hreflang: replace the whole contiguous run of alternates
    doc = _sub1(doc, r'(?:[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n?)+',
                _hreflang_block(slug, lang) + '\n', 'hreflang')

    # ── JSON-LD ──
    doc = _sub1(doc, r'"headline": "(?:[^"\\]|\\.)*"', f'"headline": {json.dumps(h1, ensure_ascii=False)}', 'headline')
    doc = _sub1(doc, r'"description": "(?:[^"\\]|\\.)*"', f'"description": {json.dumps(desc, ensure_ascii=False)}', 'ld description')
    doc = _sub1(doc, r'"datePublished": "[^"]*"', f'"datePublished": "{pub}"', 'datePublished')
    doc = _sub1(doc, r'"dateModified": "[^"]*"', f'"dateModified": "{mod}"', 'dateModified')
    doc = _sub1(doc, r'"@id": "https://sabdastudio\.com/blog/[^"]*"', f'"@id": "{url}"', 'mainEntityOfPage')
    # breadcrumb leaf
    doc = re.sub(r'("position": 3,\s*\n\s*"name": )"(?:[^"\\]|\\.)*"',
                 lambda mm: mm.group(1) + json.dumps(h1, ensure_ascii=False), doc, count=1)
    doc = re.sub(r'("position": 3,(?:.|\n)*?"item": )"[^"]*"',
                 lambda mm: mm.group(1) + f'"{url}"', doc, count=1)

    # ── nav active link ──
    doc = doc.replace(f'<a href="{ref_slug}" class="active"', f'<a href="{slug}" class="active"')

    # ── hero, breadcrumb, article heading ──
    doc = re.sub(r'(<div class="hero-eyebrow">[^<]*</div>\s*\n\s*<h1>)[^<]*(</h1>)',
                 lambda mm: mm.group(1) + esc(h1) + mm.group(2), doc, count=1)
    doc = re.sub(r'(class="breadcrumbs">.*?<span>)[^<]*(</span></nav>)',
                 lambda mm: mm.group(1) + esc(h1) + mm.group(2), doc, count=1, flags=re.S)
    doc = re.sub(r'(<article class="article">\s*\n\s*<h1>)[^<]*(</h1>)',
                 lambda mm: mm.group(1) + esc(h1) + mm.group(2), doc, count=1)

    # ── byline date ──
    doc = _sub1(doc, r'<time datetime="[^"]*">[^<]*</time>',
                f'<time datetime="{mod}">{_display_date(mod, lang)}</time>', 'byline date')

    # ── body ──
    # Strip the writer's production notes. These are whole lines of the form
    # *[Schema: ...]*, *[Images needed: ...]*, *[Update frequency: ...]*,
    # *[hreflang: ...]*. Without this they render as visible italic text at the
    # foot of the published article.
    body_md = re.sub(r'^[ \t]*\*?\[[^\]]+\]\*?[ \t]*$\n?', '', body_md, flags=re.MULTILINE)
    # The notes usually sat under a trailing '---', which would otherwise render
    # as a stray horizontal rule at the foot of the article.
    body_md = re.sub(r'\n-{3,}\s*$', '', body_md.rstrip())
    md = markdown.Markdown(extensions=['extra', 'sane_lists', 'attr_list'])
    body_html = blog_enhance.enhance(md.convert(body_md))
    start = doc.find('</div>', doc.find('<div class="article-meta">')) + len('</div>')
    end = doc.find('</article>')
    if start <= 0 or end <= start:
        raise RuntimeError('render: could not locate the article body region')
    doc = doc[:start] + '\n' + body_html + '\n ' + doc[end:]

    doc = blog_enhance.inject_design(doc)

    missing = [name for name, needle in REQUIRED_MARKERS if needle not in doc]
    if missing:
        raise RuntimeError(f'render: output is missing {missing}. '
                           f'Reference {REFERENCE[lang]} may be stale.')

    out_path = REPO / slug.strip('/') / 'index.html'

    # Body content that lives only in the published HTML, never in the markdown,
    # would be destroyed by a re-render. The seeded founder pull-quotes are the
    # known case. Refuse rather than silently drop them.
    if out_path.exists():
        prev_body = out_path.read_text(encoding='utf-8')
        pi = prev_body.find('</div>', prev_body.find('<div class="article-meta">'))
        prev_body = prev_body[pi:prev_body.find('</article>')] if pi > 0 else ''
        if '<blockquote' in prev_body and '<blockquote' not in body_html:
            raise RuntimeError(
                f'{slug}: the live page has a pull-quote that the markdown does not. '
                f'Re-rendering would delete it. Port the quote into {md_path} first, '
                f'or leave this article alone.')

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(doc, encoding='utf-8')
    return (f'{slug} [{lang}] noindex={noindex} pub={pub} mod={mod}', None)


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
