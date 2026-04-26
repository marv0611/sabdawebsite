#!/bin/bash
# SABDA pre-push audit — blocks pushes that would break production
# Runtime ~3-5s. Bypass: git push --no-verify
set -e

python3 - <<'EOF'
import re, subprocess, sys, os, glob

BOOKING = [
  'classes.html','classes/index.html','es/clases/index.html','ca/classes/index.html',
  'm/schedule.html','es/m/schedule.html','ca/m/schedule.html',
]
ALL_HTML = [p for p in glob.glob('./**/*.html', recursive=True) if 'node_modules' not in p]
issues = []

# ═══════════════════════════════════════════════════════════════════
# BOOKING-FLOW CHECKS (critical — broken flow = zero revenue)
# ═══════════════════════════════════════════════════════════════════
for p in BOOKING:
    if not os.path.exists(p): continue
    s = open(p).read()

    # 1. JS syntax
    scripts = re.findall(r'<script(?![^>]*\bsrc=)(?![^>]*application/ld\+json)[^>]*>([\s\S]*?)</script>', s)
    open('/tmp/audit.js','w').write('\n;\n'.join(scripts))
    r = subprocess.run(['node','--check','/tmp/audit.js'], capture_output=True, text=True)
    if r.returncode:
        issues.append(f'[SYNTAX]        {p}: {r.stderr.splitlines()[0] if r.stderr else "check failed"}')

    # 2. Undefined function references
    defined  = set(re.findall(r'\bfunction\s+([_a-zA-Z]\w*)', s))
    defined |= set(re.findall(r'window\.([_a-zA-Z]\w*)\s*=\s*function', s))
    defined |= set(re.findall(r'\b([_a-zA-Z]\w*)\s*=\s*function', s))
    called   = set(re.findall(r'\b(_fb[A-Z]\w+|_sabda[A-Z]\w+|fbqAdvancedMatch)\s*\(', s))
    for c in called:
        if c not in defined:
            # ALLOW guarded references: `if (typeof window.fn === 'function')` is
            # graceful degradation, not a bug. The code falls back cleanly when
            # the function is absent.
            guard_pattern = r"typeof\s+window\." + re.escape(c) + r"\s*===?\s*['\"]function['\"]"
            if re.search(guard_pattern, s):
                continue
            issues.append(f'[UNDEFINED_FN]  {p}: {c} called but not defined')

    # 3. Bare .catch — swallows errors
    for ln, line in enumerate(s.split('\n'), 1):
        if re.search(r'\.catch\s*\(\s*function\s*\(\s*\)\s*\{', line):
            issues.append(f'[BARE_CATCH]    {p}:{ln} — use .catch(function(e){{console.error...}})')

    # 4. Duplicate function decls (showFallback excluded — intentionally unified)
    for fn_match in set(re.findall(r'\bfunction\s+([_a-zA-Z]\w*)', s)):
        if fn_match == 'showFallback': continue
        count = len(re.findall(r'\bfunction\s+'+re.escape(fn_match)+r'\s*\(', s))
        if count > 1:
            issues.append(f'[DUPLICATE_FN]  {p}: {fn_match} declared {count}×')


    # 4b. showLoginStep must NOT contain pendingPack logic or customerFieldsHTML()
    # These belong exclusively in showGuestStep. If they leak into the login step,
    # the login button gets pushed below the viewport and the flow breaks (ES/CA bug 2026-04-13).
    import re as _re
    m = _re.search(r'function showLoginStep\(\)\{[\s\S]*?\n\}', s)
    if m:
        login_body = m.group(0)
        if 'pendingPack' in login_body:
            issues.append(f'[LOGIN_LEAK]    {p}: showLoginStep contains pendingPack logic — must only be in showGuestStep')
        if 'customerFieldsHTML' in login_body:
            issues.append(f'[LOGIN_LEAK]    {p}: showLoginStep calls customerFieldsHTML() — must only be in showGuestStep')
        if 'bk-pack-customer' in login_body:
            issues.append(f'[LOGIN_LEAK]    {p}: showLoginStep references bk-pack-customer — must only be in showGuestStep')
        if 'bk-card' in login_body and 'mountCardForGuest' not in login_body:
            # mountCardForGuest is legit in other contexts; bare bk-card in login = leak
            issues.append(f'[LOGIN_LEAK]    {p}: showLoginStep renders bk-card element — must only be in showGuestStep/showNoMembership')

# ═══════════════════════════════════════════════════════════════════
# SITE-WIDE CHECKS
# ═══════════════════════════════════════════════════════════════════

# 5. Smart/curly quotes in JS — crash all JS silently
# Check inline <script> bodies only (copy can have curly quotes freely)
for p in ALL_HTML:
    s = open(p).read()
    for m in re.finditer(r'<script(?![^>]*\bsrc=)(?![^>]*application/ld\+json)[^>]*>([\s\S]*?)</script>', s):
        body = m.group(1)
        bad = re.findall(r'[\u2018\u2019\u201C\u201D]', body)
        if bad:
            # Find line number of first bad char
            pre = s[:m.start() + m.group(0).index(bad[0])]
            ln = pre.count('\n') + 1
            issues.append(f'[CURLY_QUOTE]   {p}:{ln} — smart quote in <script> (crashes JS silently)')
            break

# 6. Em-dashes in user-visible body copy (banned per brand rules)
# Scan <body> text nodes only. Skip <meta>, <title>, <style>, <script>, CSS comments.
for p in ALL_HTML:
    s = open(p).read()
    body_match = re.search(r'<body[^>]*>([\s\S]*?)</body>', s, re.IGNORECASE)
    if not body_match: continue
    body = body_match.group(1)
    # Strip scripts, styles, comments
    body = re.sub(r'<script[\s\S]*?</script>', '', body)
    body = re.sub(r'<style[\s\S]*?</style>', '', body)
    body = re.sub(r'<!--[\s\S]*?-->', '', body)
    # Strip attributes — only want text between tags
    # Extract text nodes (everything not inside < ... >)
    text_only = re.sub(r'<[^>]+>', '|', body)
    if '\u2014' in text_only:
        # Find line in original source
        offset = s.find('\u2014', body_match.start())
        ln = s[:offset].count('\n') + 1
        issues.append(f'[EM_DASH]       {p}:{ln} — em-dash in visible body copy (banned per brand rules)')

# 7. Exposed credentials — catastrophic if pushed
CREDS = [
    (r'github_pat_[A-Za-z0-9_]{40,}', 'GitHub PAT'),
    (r'ghp_[A-Za-z0-9]{36,}',          'GitHub classic token'),
    (r'cfut_[A-Za-z0-9]{40,}',         'Cloudflare user token'),
    (r'sk_live_[A-Za-z0-9]{24,}',      'Stripe SECRET key (NEVER commit)'),
    (r'sk_test_[A-Za-z0-9]{24,}',      'Stripe test secret key'),
    (r'AKIA[0-9A-Z]{16}',              'AWS access key'),
    (r'xoxb-[0-9]+-[0-9]+-[A-Za-z0-9]+', 'Slack bot token'),
]
# Scan all files staged for commit, not just HTML
for p in glob.glob('./**/*', recursive=True):
    if not os.path.isfile(p): continue
    if 'node_modules' in p or '.git/' in p: continue
    if p.endswith(('.png','.jpg','.jpeg','.webp','.mp4','.mov','.gif','.ico','.woff','.woff2','.ttf','.otf','.pdf')): continue
    try: txt = open(p).read()
    except: continue
    for pattern, label in CREDS:
        if re.search(pattern, txt):
            issues.append(f'[SECRET_LEAK]   {p} — contains {label}. REMOVE before push.')
            break

# 8. Missing critical meta tags on entry pages
# GA4, FB Pixel, Clarity, facebook-domain-verification
ENTRY = ['index.html','es/index.html','ca/index.html',
         'intro/index.html','es/intro/index.html','ca/intro/index.html',
         'classes.html','m/schedule.html']
REQUIRED = {
    'G-1E1WXTZWQD':                          'GA4 measurement ID',
    '567636669734630':                       'Meta Pixel ID',
    'facebook-domain-verification':          'Meta domain verification',
    'waoyd1cczc':                            'Microsoft Clarity',
}
for p in ENTRY:
    if not os.path.exists(p): continue
    s = open(p).read()
    for needle, label in REQUIRED.items():
        if needle not in s:
            issues.append(f'[MISSING_TAG]   {p} — {label} ({needle}) not found')

# 9. Broken language-switcher links → #  (only on pages that have translations)
for p in ALL_HTML:
    if '/m/' in p or '/blog/' in p or '/intro/' in p: continue  # known no-translation pages
    s = open(p).read()
    # Only flag if href="#" on a lang label AND the page isn't the landing page (which uses # correctly for the active lang)
    for m in re.finditer(r'<a\s+href="#"(?!\s+class="active")[^>]*>(EN|ES|CA)</a>', s):
        lang = m.group(1)
        ln = s[:m.start()].count('\n') + 1
        issues.append(f'[BROKEN_LANG]   {p}:{ln} — {lang} link points to # (dead)')
        break

# 10. HTML structural sanity
for p in ALL_HTML:
    s = open(p).read()
    checks = {
      '</html>': 1, '</body>': 1, '</head>': 1,
    }
    for tag, expected in checks.items():
        cnt = s.count(tag)
        if cnt != expected:
            issues.append(f'[HTML_STRUCT]   {p} — {tag} count={cnt}, expected={expected}')
            break  # don't spam for same file
    # Balanced <script> / </script>
    open_scripts = len(re.findall(r'<script[\s>]', s))
    close_scripts = s.count('</script>')
    if open_scripts != close_scripts:
        issues.append(f'[HTML_STRUCT]   {p} — <script>={open_scripts}, </script>={close_scripts}')

# 11. Worker syntax
if os.path.exists('cloudflare-worker-checkout-proxy.js'):
    r = subprocess.run(['node','--check','cloudflare-worker-checkout-proxy.js'],
                       capture_output=True, text=True)
    if r.returncode:
        issues.append(f'[SYNTAX]        worker: {r.stderr.splitlines()[0] if r.stderr else "check failed"}')

# 12. Worker Momence fetches missing Host header
if os.path.exists('cloudflare-worker-checkout-proxy.js'):
    ws = open('cloudflare-worker-checkout-proxy.js').read()
    # Find every fetch(MOMENCE + ...) and make sure Host header is set nearby
    for m in re.finditer(r'fetch\(\s*MOMENCE\s*\+[^)]+\)', ws):
        snippet = ws[max(0,m.start()-400):m.end()+200]
        if "'Host'" not in snippet and '"Host"' not in snippet and 'momenceHeaders' not in snippet:
            ln = ws[:m.start()].count('\n') + 1
            issues.append(f'[WORKER_HOST]   worker:{ln} — fetch(MOMENCE+...) without Host header or momenceHeaders()')


# 13. Cross-locale link leaks: <a> tags in /es/ or /ca/ pages pointing to EN paths
import glob as _glob
_EN_PATHS = ['/classes/','/pricing/','/schedule/','/about/','/contact/','/events/','/hire/','/faq/']
for p in _glob.glob('ca/**/*.html', recursive=True) + _glob.glob('es/**/*.html', recursive=True):
    s_f = open(p).read()
    for m in re.finditer(r'<a\b[^>]*\bhref="(/(?:classes|pricing|schedule|about|contact|events|hire|faq|m)(?:/[^"]*)?)"[^>]*>([^<]*)</a>', s_f, re.IGNORECASE):
        inner = m.group(2).strip()
        if inner in ('EN','ES','CA','English','Español','Català','Catalan','Spanish'): continue
        locale = 'ca' if p.startswith('ca/') else 'es'
        issues.append(f'[CROSS_LOCALE]  {p} — <a href="{m.group(1)}"> leaks to EN path on {locale.upper()} page')
        break

# ═══════════════════════════════════════════════════════════════════
# 14. CAPI PARITY — every Pixel event must have a CAPI companion
# ═══════════════════════════════════════════════════════════════════
# HISTORY: 2026-04-16 — shipped CAPI for Lead/IC/VC/ATC after discovering
# these events were Pixel-only (no server-side channel). Meta EMQ stayed at
# ~5/10 because Pixel alone can't send hashed PII server-side when cookies
# are blocked. This check ensures we never ship raw fbq('track','X') without
# a CAPI companion again.
#
# WHAT'S CHECKED:
#   - Any fbq('track', EVENT_NAME) call for Purchase/Lead/InitiateCheckout/
#     ViewContent/AddToCart must be within 5 lines of either:
#       a) _sabdaFireWithCAPI('EVENT_NAME', ...) — intro pages
#       b) _fbCapiSend('EVENT_NAME', ...)        — booking pages
#       c) _fbCapiAfter3DS({...})                — Purchase 3DS bridge
#     OR be inside a helper function fallback (try/catch branch)
#   - Raw fbq() calls for tracked events trigger [CAPI_PARITY] errors.
#
# WHY: the gap was invisible until checked at commit time. Adding CAPI
# per event requires touching 6+ files. Without this guard, a future
# edit could revert coverage silently.
TRACKED_EVENTS = ['Purchase','Lead','InitiateCheckout','ViewContent','AddToCart']
CAPI_FUNCS = ['_sabdaFireWithCAPI','_fbCapiSend','_fbCapiAfter3DS']
# Files where tracking fires — check parity on these
TRACKED_FILES = [
    'classes.html','classes/index.html',
    'm/schedule.html','es/m/schedule.html','ca/m/schedule.html',
    'intro/index.html','es/intro/index.html','ca/intro/index.html',
    'm/intro.html','es/m/intro.html','ca/m/intro.html',
]
def _is_inside_v2_module(src, line_num):
    """Returns True if line_num is inside a SABDA-MOMENCE-PASSTHROUGH-v2 IIFE block."""
    # Find the v2 marker, then find the </script> that closes its block.
    marker = src.find('SABDA-MOMENCE-PASSTHROUGH-v2')
    if marker == -1: return False
    # Find the </script> after the marker
    script_end = src.find('</script>', marker)
    if script_end == -1: return False
    # Convert line_num (1-indexed) to char offset
    lines = src.split('\n')
    if line_num > len(lines): return False
    char_offset = sum(len(l)+1 for l in lines[:line_num-1])
    return marker < char_offset < script_end

for p in TRACKED_FILES:
    if not os.path.exists(p): continue
    s = open(p).read()
    lines = s.split('\n')
    # Find every fbq('track','EVENT') call
    for i, line in enumerate(lines):
        # Skip comments
        if line.strip().startswith('//') or line.strip().startswith('*'): continue
        # Skip the inside of _sabdaTrack/_sabdaFireWithCAPI helpers themselves
        # (they CONTAIN a fbq call that's the Pixel half — that's legitimate)
        # Detect: is this line inside a function named _sabda* or _fb*?
        # Simple heuristic: if the fbq call is preceded by a `function _sabda...` or `function _fb...`
        # within 20 lines upward, skip it.
        window_up = '\n'.join(lines[max(0,i-30):i])
        in_helper = bool(re.search(r'function\s+(_sabda\w+|_fb\w+|_sabdaFireWithCAPI|_fbCapiSend|_sabdaTrack)\s*\(', window_up)) and window_up.count('{') > window_up.count('}')
        if in_helper: continue
        # POST-PIVOT (2026-04-25): v2 passthrough module fires Pixel-only IC at click time.
        # IC inside v2 module is intentional — booking flow goes off-domain to Momence,
        # so no server-side CAPI Purchase to need parity for.
        if _is_inside_v2_module(s, i+1): continue
        # Check for fbq('track','EVENT'
        m = re.search(r"fbq\(\s*['\"]track['\"]\s*,\s*['\"](\w+)['\"]", line)
        if not m: continue
        event = m.group(1)
        if event not in TRACKED_EVENTS: continue
        # Check the ±5 line window for a CAPI companion or _sabdaTrack (which itself
        # has CAPI parity enforced separately in the booking files)
        window = '\n'.join(lines[max(0,i-5):min(len(lines),i+6)])
        has_capi = any(fn in window for fn in CAPI_FUNCS)
        # Also accept _sabdaTrack IF we're in a booking file (which has _fbCapiSend
        # wired into its tracker functions). Intro pages don't have _sabdaTrack.
        if '_sabdaTrack(' in window and p in ('classes.html','classes/index.html','m/schedule.html','es/m/schedule.html','ca/m/schedule.html'):
            # verify the enclosing tracker function ALSO calls _fbCapiSend somewhere
            # Simplest: just check if _fbCapiSend appears in the file at all
            if '_fbCapiSend' in s: has_capi = True
        if not has_capi:
            issues.append(f'[CAPI_PARITY]   {p}:{i+1} — fbq(\'track\',\'{event}\') without CAPI companion in ±5 lines')

# 15. TRACKER FUNCTION PARITY — each _fbTrack* helper in booking files must
# fire both Pixel AND CAPI. Prevents regressions where someone "simplifies"
# a tracker down to Pixel-only.
BOOKING_FILES = ['classes.html','classes/index.html','m/schedule.html',
                 'es/m/schedule.html','ca/m/schedule.html']
def _extract_fn_body(src, fn_name):
    """Extract function body with proper brace matching (handles try/catch/nested blocks)."""
    m = re.search(r'function\s+' + re.escape(fn_name) + r'\s*\([^)]*\)\s*\{', src)
    if not m: return None, None
    start = m.end()  # position right after opening {
    depth = 1
    i = start
    while i < len(src) and depth > 0:
        c = src[i]
        if c == '{': depth += 1
        elif c == '}': depth -= 1
        elif c == '/' and i+1 < len(src):
            # Skip string literals and comments (simplified — skip // to newline and /* to */)
            if src[i+1] == '/':
                nl = src.find('\n', i)
                i = nl if nl != -1 else len(src)
                continue
            elif src[i+1] == '*':
                end = src.find('*/', i+2)
                i = end + 2 if end != -1 else len(src)
                continue
        elif c in ('"', "'"):
            # Skip string literal
            end = i + 1
            while end < len(src) and src[end] != c:
                if src[end] == '\\': end += 2
                else: end += 1
            i = end + 1
            continue
        i += 1
    return src[start:i-1], m.start()  # body + start-line-of-function

for p in BOOKING_FILES:
    if not os.path.exists(p): continue
    s = open(p).read()
    for fn_name in ['_fbTrackLead','_fbTrackInitiateCheckout','_fbTrackViewContent']:
        body, fn_start = _extract_fn_body(s, fn_name)
        if body is None: continue
        has_pixel = ('fbq(' in body) or ('_sabdaTrack(' in body)
        has_capi  = '_fbCapiSend(' in body
        if has_pixel and not has_capi:
            line_num = s[:fn_start].count('\n') + 1
            issues.append(f'[TRACKER_GAP]   {p}:{line_num} — {fn_name} fires Pixel but no CAPI companion (_fbCapiSend)')


# 16. INTRO PAGE TRACKING HEALTH — every /intro/ page must:
#   a) have the attribution script
#   b) have _sabdaFireWithCAPI defined
#   c) NEVER fire raw fbq('track','X') for tracked events — only via helper
# (Exception: fbq('track','PageView') is fine raw — no CAPI needed for it.)
INTRO_PAGES = ['intro/index.html','es/intro/index.html','ca/intro/index.html',
               'm/intro.html','es/m/intro.html','ca/m/intro.html']
for p in INTRO_PAGES:
    if not os.path.exists(p): continue
    s = open(p).read()
    if '_sabdaGetAttribution' not in s:
        issues.append(f'[INTRO_TRACK]   {p} — missing attribution capture script (_sabdaGetAttribution)')
    # Must NOT fire _sabdaFireWithCAPI BEFORE the attribution script loads.
    # RACE CONDITION: if the CAPI fire runs first, window._sabdaGetAttribution is
    # undefined and returns null → the event ships with no UTM/fbclid data and
    # we can't attribute it to its Meta Ads source. This bug cost us 50+ daily
    # ad-click attributions until caught (see git log — 2026-04-16 commit).
    attr_line = None
    vc_fire_line = None
    for i, line in enumerate(s.split('\n'), 1):
        if '_sabda_attr' in line and attr_line is None:
            attr_line = i
        if "_sabdaFireWithCAPI('ViewContent'" in line and vc_fire_line is None:
            vc_fire_line = i
    if attr_line and vc_fire_line and attr_line > vc_fire_line:
        issues.append(f'[ATTR_RACE]     {p} — attribution script (line {attr_line}) runs AFTER _sabdaFireWithCAPI ViewContent fire (line {vc_fire_line}). Move attribution block before Pixel init.')

    # Check every line for raw fbq track of tracked events.
    # A line with `fbq('track','TrackedEvent')` is OK ONLY if the call site is
    # lexically INSIDE function _sabdaFireWithCAPI (not merely below its definition).
    lines = s.split('\n')
    # Pre-compute: for each position in source, is it inside _sabdaFireWithCAPI?
    def _is_inside_helper(src, pos):
        m = re.search(r'function\s+_sabdaFireWithCAPI\s*\([^)]*\)\s*\{', src)
        if not m: return False
        fn_body_start = m.end()
        if pos < fn_body_start: return False
        # Walk forward from fn_body_start counting braces to find fn body end
        depth = 1
        i = fn_body_start
        while i < len(src) and depth > 0:
            c = src[i]
            if c == '/' and i+1 < len(src) and src[i+1] == '/':
                nl = src.find('\n', i);  i = nl if nl != -1 else len(src); continue
            if c == '/' and i+1 < len(src) and src[i+1] == '*':
                end = src.find('*/', i+2); i = end+2 if end != -1 else len(src); continue
            if c in ('"', "'"):
                end = i + 1
                while end < len(src) and src[end] != c:
                    if src[end] == '\\': end += 2
                    else: end += 1
                i = end + 1; continue
            if c == '{': depth += 1
            elif c == '}': depth -= 1
            i += 1
        fn_body_end = i  # position after the closing brace
        return fn_body_start <= pos < fn_body_end

    for i, line in enumerate(lines):
        if line.strip().startswith('//') or line.strip().startswith('*'): continue
        for bad_evt in ['ViewContent','AddToCart','InitiateCheckout','Lead','Purchase']:
            m = re.search(r"fbq\(\s*['\"]track['\"]\s*,\s*['\"]" + bad_evt + r"['\"]", line)
            if not m: continue
            # Compute absolute position of this match
            line_offset = sum(len(l)+1 for l in lines[:i]) + m.start()
            if _is_inside_helper(s, line_offset):
                continue  # legit — Pixel half of _sabdaFireWithCAPI
            # POST-PIVOT: v2 module fires Pixel-only IC on intro pages too.
            if _is_inside_v2_module(s, i+1):
                continue
            issues.append(f'[INTRO_TRACK]   {p}:{i+1} — raw fbq(\'track\',\'{bad_evt}\') on intro page — use _sabdaFireWithCAPI instead')
            break


# 17. WORKER CAPI ENDPOINT HEALTH — ensure /capi-event route exists
if os.path.exists('cloudflare-worker-checkout-proxy.js'):
    w = open('cloudflare-worker-checkout-proxy.js').read()
    for route, label in [('/sabda-api/capi-purchase','CAPI Purchase'),
                          ('/sabda-api/capi-event','CAPI generic (Lead/IC/VC/ATC)'),
                          ('/sabda-api/store-attribution','Attribution storage for Momence-native purchase matching'),
                          ('/sabda-api/webhook/purchase','Purchase webhook for Momence/Zapier')]:
        if route not in w:
            issues.append(f'[WORKER_ROUTE]  worker missing route {route} ({label})')
    # sendCAPIEvent signature must accept attribution + contentMeta
    if 'sendCAPIEvent' in w:
        sig_match = re.search(r'async function sendCAPIEvent\(([^)]*)\)', w)
        if sig_match:
            sig = sig_match.group(1)
            for required in ['attribution','contentMeta']:
                if required not in sig:
                    issues.append(f'[WORKER_SIG]    sendCAPIEvent missing \'{required}\' parameter — would break CAPI features')


# ═══════════════════════════════════════════════════════════════════
# 18. CAPI KEEPALIVE — _fbCapiSend fetch must use keepalive:true
# ═══════════════════════════════════════════════════════════════════
# HISTORY: 2026-04-16 — fetch without keepalive got aborted by Instagram
# in-app browser on page navigation, silently dropping CAPI events.
# keepalive:true + sendBeacon fallback makes CAPI survive any client env.
for p in BOOKING:
    if not os.path.exists(p): continue
    s = open(p).read()
    # Find _fbCapiSend definition body and check it contains keepalive
    capi_def = re.search(r'window\._fbCapiSend\s*=\s*function[\s\S]*?(?=\nlet\s|;?\n(?:var|let|const|function|window\.))', s)
    if capi_def:
        body = capi_def.group(0)
        if 'keepalive' not in body:
            issues.append(f'[CAPI_KEEPALIVE] {p} — _fbCapiSend fetch missing keepalive:true (breaks in Instagram IAB)')
        if 'sendBeacon' not in body:
            issues.append(f'[CAPI_KEEPALIVE] {p} — _fbCapiSend missing sendBeacon fallback (breaks when fetch is blocked)')

# ═══════════════════════════════════════════════════════════════════
# 19. CAPI/FBQ DECOUPLING — _fbCapiSend must never be gated on fbq
# ═══════════════════════════════════════════════════════════════════
# HISTORY: 2026-04-16 — all 10 trifecta fire sites had CAPI gated inside
# `if(... && typeof fbq==='function')`, so any fbq failure also killed CAPI.
# CAPI is server-side and must fire independently.
for p in BOOKING:
    if not os.path.exists(p): continue
    for ln, line in enumerate(open(p).read().split('\n'), 1):
        if '_fbCapiSend' in line and "typeof fbq==='function'" in line:
            issues.append(f'[CAPI_FBQ_GUARD] {p}:{ln} — _fbCapiSend is gated on typeof fbq. CAPI must fire independently of Pixel.')

# ═══════════════════════════════════════════════════════════════════
# 20. MODAL TRACKING — conversion-critical modal openers must fire IC
# ═══════════════════════════════════════════════════════════════════
# HISTORY: 2026-04-16 — openPackagePurchase() opened checkout modal with
# zero tracking. 53 ad clicks, 0 InitiateCheckout fires, 0 purchases.
# Any function that opens a purchase modal for a deep-link must fire IC.
MODAL_OPENERS = ['openPackagePurchase', 'checkUrlPack']
for p in BOOKING:
    if not os.path.exists(p): continue
    s = open(p).read()
    for opener in MODAL_OPENERS:
        # Find function body (simple: from 'function opener(' to next 'function ' at same indent)
        fn_start = s.find(f'function {opener}(')
        if fn_start == -1:
            fn_start = s.find(f'{opener} = function(')
        if fn_start == -1: continue
        # Extract ~200 lines or until next top-level function
        fn_body = s[fn_start:fn_start+8000]
        # Check it contains an IC fire (either _fbCapiSend('InitiateCheckout' or _fbTrackInitiateCheckout)
        has_ic = ('InitiateCheckout' in fn_body[:4000])
        if not has_ic:
            issues.append(f'[MODAL_TRACKING] {p} — {opener}() opens checkout modal but never fires InitiateCheckout. Meta optimizer blind.')


WARN_TAGS = ['[EM_DASH]', '[BROKEN_LANG]']
blockers = [i for i in issues if not any(t in i for t in WARN_TAGS)]
warnings = [i for i in issues if any(t in i for t in WARN_TAGS)]

if warnings:
    print('⚠️  Warnings (non-blocking):')
    for w in warnings[:20]:
        print(f'   {w}')
    if len(warnings) > 20: print(f'   … {len(warnings)-20} more warnings')
    print()

if blockers:
    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    print(f'❌ PUSH BLOCKED — {len(blockers)} blocker(s):')
    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    for i in blockers[:30]: print(f'  {i}')
    if len(blockers) > 30: print(f'  … {len(blockers)-30} more')
    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    print('Fix blockers before pushing. Emergency bypass: git push --no-verify')
    sys.exit(1)

print('✅ Audit clean — safe to push')
print(f'   Checked: {len(BOOKING)} booking files, {len(ALL_HTML)} HTML files, worker')
if warnings: print(f'   ({len(warnings)} warnings — review when you have time)')
EOF
