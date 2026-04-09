#!/usr/bin/env python3
"""Catalan translation audit — Q1-Q7. Run after every pass."""

import re, subprocess, pathlib, json, sys

ROOT = pathlib.Path('/home/claude/sabdawebsite')
BASE = 'https://sabdastudio.com'

CA_FILES = sorted(ROOT.glob('ca/**/*.html'))
print(f"Auditing {len(CA_FILES)} CA pages\n" + "="*70)

if not CA_FILES:
    print("No CA files found yet.")
    sys.exit(0)

total_issues = 0

# ── Q5: JS + JSON-LD validity ──
def validate_js_jsonld(p):
    issues = []
    s = p.read_text()
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', s, flags=re.S|re.I)
    for i, js in enumerate(scripts):
        if not js.strip(): continue
        stripped = js.strip()
        if stripped.startswith(('{','[')):
            try: json.loads(stripped)
            except json.JSONDecodeError as e:
                issues.append(('JSON-LD', i, str(e)[:100]))
        else:
            with open('/tmp/v.js','w') as f: f.write(js)
            r = subprocess.run(['node','--check','/tmp/v.js'], capture_output=True, text=True)
            if r.returncode != 0:
                issues.append(('JS', i, (r.stderr.split('\n')[0])[:100]))
    return issues

# ── Q6: Text-node audit ──
EN_PHRASES = [
    r'\breviews\b', r'\bbook now\b', r'\bsign up\b', r'\bsign in\b', r'\blog in\b',
    r'\bsending\.\.\.', r'\bloading\.\.\.', r'\bprocessing\.\.\.', r'\bbooking\.\.\.',
    r'\bclick here\b', r'\blearn more\b', r'\bread more\b', r'\bbook a class\b',
    r'\bpay & book\b', r'\bsend message\b', r'\bsend inquiry\b', r'\benter a code\b',
    r'\bchoose a class\b', r'\binvalid promo code\b', r'\bcard details\b',
    r'\bor pay with card\b', r'\bchange plan\b', r'\bfirst month\b', r'\bbilled once\b',
    r'\bbooking as\b', r'\bbilled monthly\b', r'\bpayment form could not\b',
    r'\bforgot your password\b', r'\baccount found\b', r'\bnew here\b',
    r'\bbook as guest\b', r'\blog in & book\b', r'\bbooked with us\b',
    r'\bcorporate wellness\b', r'\bscroll to top\b', r'\bback to schedule\b',
    r'>Apply<', r'>Remove<', r'>Done<', r'>Close<', r'>Cancel<',
    r'\bat sabda\b', r'15,000\+ reviews',
]
CA_CHARS = re.compile(r'[àèéíïòóúüçÀÈÉÍÏÒÓÚÜÇ]')

def is_real_en(text):
    if not text or len(text) < 4: return False
    if CA_CHARS.search(text): return False
    lower = text.lower().strip()
    for pat in EN_PHRASES:
        if re.search(pat, lower):
            return True
    return False

def text_audit(p):
    findings = []
    html = p.read_text()
    body = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.S|re.I)
    body = re.sub(r'<style[^>]*>.*?</style>', ' ', body, flags=re.S|re.I)
    body = re.sub(r'<!--.*?-->', ' ', body, flags=re.S)
    for n in re.split(r'<[^>]+>', body):
        # Split on space-surrounded separators only (protects l·l geminated L)
        for frag in re.split(r' [·•|—]\s|\s[·•|—] ', n.strip()):
            frag = frag.strip()
            if is_real_en(frag):
                findings.append(('text', frag[:100]))
    for attr in ['aria-label','alt','placeholder','title','data-tooltip']:
        for m in re.finditer(rf'\b{attr}="([^"]+)"', html):
            if is_real_en(m.group(1)):
                findings.append((attr, m.group(1)[:100]))
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, flags=re.S|re.I)
    for js in scripts:
        if js.strip().startswith(('{','[')): continue
        for m in re.finditer(r"'([^'\n]{4,150})'", js):
            v = m.group(1).strip()
            if is_real_en(v):
                findings.append(('js', v[:100]))
    return findings

# ── Q7: JS identifier corruption ──
CORRUPT = [
    r'\.getDia\b', r'\.getHora\b', r'\.getMes\b', r'\.getAny\b',
    r'\.toLocaleHoraString\b', r'\.toLocaleDataString\b',
    r'\bdataHora\b', r'\bdateHora\b',
    r"isLlista d'espera", r"allowLlista d'espera",
    r'\.getDía\b', r'\.getHora\b',
    r'\bisLista de espera\b', r'\ballowLista de espera\b',
    r'renderDies\b', r'selDia\b',
]

# ── Q3: structural parity check ──
EN_PAGES = {
    'index.html': 'ca/index.html',
    'classes/index.html': 'ca/classes/index.html',
    'classes/yoga/index.html': 'ca/classes/yoga/index.html',
    'classes/pilates/index.html': 'ca/classes/pilates/index.html',
    'classes/breathwork/index.html': 'ca/classes/breathwork/index.html',
    'classes/sound-healing/index.html': 'ca/classes/sound-healing/index.html',
    'classes/ice-bath/index.html': 'ca/classes/ice-bath/index.html',
    'classes/ecstatic-dance/index.html': 'ca/classes/ecstatic-dance/index.html',
    'classes/meditation/index.html': 'ca/classes/meditacio/index.html',
    'pricing/index.html': 'ca/preus/index.html',
    'about/index.html': 'ca/sobre/index.html',
    'hire/index.html': 'ca/lloguer/index.html',
    'events/index.html': 'ca/esdeveniments/index.html',
    'contact/index.html': 'ca/contacte/index.html',
    'faq/index.html': 'ca/faq/index.html',
    'team-building/index.html': 'ca/team-building/index.html',
    'experiencia-inmersiva/index.html': 'ca/experiencia-immersiva/index.html',
    'schedule.html': 'ca/schedule.html',
}

print("\n── Q3: Structural parity ──")
for en, ca in EN_PAGES.items():
    en_p = ROOT / en
    ca_p = ROOT / ca
    en_exists = en_p.exists()
    ca_exists = ca_p.exists()
    if not ca_exists:
        print(f"  MISSING: {ca}")
        total_issues += 1

print("\n── Q4: Hreflang check (CA files) ──")
for p in CA_FILES:
    s = p.read_text()
    has_en = bool(re.search(r'hreflang="en"', s))
    has_es = bool(re.search(r'hreflang="es"', s))
    has_ca = bool(re.search(r'hreflang="ca"', s))
    if not (has_en and has_ca):
        rel = str(p.relative_to(ROOT))
        print(f"  HREFLANG MISSING: {rel} (en:{has_en} es:{has_es} ca:{has_ca})")
        total_issues += 1

print("\n── Q5: JS + JSON-LD validity ──")
for p in CA_FILES:
    issues = validate_js_jsonld(p)
    if issues:
        rel = str(p.relative_to(ROOT))
        print(f"  {rel}:")
        for issue in issues:
            print(f"    {issue}")
        total_issues += len(issues)

print("\n── Q6: English residuals ──")
for p in CA_FILES:
    findings = text_audit(p)
    if findings:
        rel = str(p.relative_to(ROOT))
        print(f"  {rel}:")
        for f in findings[:10]:
            print(f"    {f}")
        total_issues += len(findings)

print("\n── Q7: JS identifier corruption ──")
for p in CA_FILES:
    s = p.read_text()
    rel = str(p.relative_to(ROOT))
    for pat in CORRUPT:
        if re.search(pat, s):
            print(f"  {rel}: {pat}")
            total_issues += 1

print(f"\n{'='*70}")
print(f"Total issues: {total_issues}")
