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

# ═══════════════════════════════════════════════════════════════════
# RESULT — split blockers (fail push) from warnings (info only)
# ═══════════════════════════════════════════════════════════════════
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
