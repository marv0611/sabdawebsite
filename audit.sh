#!/bin/bash
# SABDA booking-flow pre-push audit
# Blocks any push that would introduce:
#   - JS syntax errors in any inline <script>
#   - Calls to undefined _fb* / _sabda* / fbqAdvancedMatch functions
#   - Bare .catch(function(){...}) blocks without error capture
#   - Duplicate function declarations (except showFallback which is intentionally unified)
#
# Runtime: ~2 seconds. Installed as .git/hooks/pre-push.
# To bypass in an emergency: git push --no-verify

set -e

python3 - <<'EOF'
import re, subprocess, sys, os

BOOKING = [
  'classes.html','classes/index.html','es/clases/index.html','ca/classes/index.html',
  'm/schedule.html','es/m/schedule.html','ca/m/schedule.html',
]

issues = []

for p in BOOKING:
    if not os.path.exists(p):
        continue
    s = open(p).read()

    # 1. JS syntax (all inline non-JSON-LD non-src scripts concatenated)
    scripts = re.findall(
      r'<script(?![^>]*\bsrc=)(?![^>]*application/ld\+json)[^>]*>([\s\S]*?)</script>',
      s
    )
    open('/tmp/audit.js','w').write('\n;\n'.join(scripts))
    r = subprocess.run(['node','--check','/tmp/audit.js'],
                       capture_output=True, text=True)
    if r.returncode:
        issues.append(f'SYNTAX  {p}: {r.stderr.splitlines()[0] if r.stderr else "check failed"}')

    # 2. Undefined function references
    defined  = set(re.findall(r'\bfunction\s+([_a-zA-Z]\w*)', s))
    defined |= set(re.findall(r'window\.([_a-zA-Z]\w*)\s*=\s*function', s))
    defined |= set(re.findall(r'\b([_a-zA-Z]\w*)\s*=\s*function', s))
    called   = set(re.findall(r'\b(_fb[A-Z]\w+|_sabda[A-Z]\w+|fbqAdvancedMatch)\s*\(', s))
    for c in called:
        if c not in defined:
            issues.append(f'UNDEFINED_FN  {p}: {c} called but never defined')

    # 3. Bare .catch blocks without `e` parameter → swallows the real error
    for line_no, line in enumerate(s.split('\n'), 1):
        # Match .catch(function() {   — no arg, no error capture
        if re.search(r'\.catch\s*\(\s*function\s*\(\s*\)\s*\{', line):
            issues.append(f'BARE_CATCH  {p}:{line_no} (.catch with no error param — will mask bugs as generic messages)')

    # 4. Duplicate function declarations (showFallback excluded, intentionally unified)
    for fn_match in re.finditer(r'\bfunction\s+([_a-zA-Z]\w*)\s*\(', s):
        fn = fn_match.group(1)
        if fn in ('showFallback',):
            continue
        count = len(re.findall(r'\bfunction\s+'+re.escape(fn)+r'\s*\(', s))
        if count > 1:
            if f'DUPLICATE  {p}: {fn}' not in [i.split(' ×')[0] for i in issues]:
                issues.append(f'DUPLICATE  {p}: {fn} declared {count}×')

# 5. Worker syntax
if os.path.exists('cloudflare-worker-checkout-proxy.js'):
    r = subprocess.run(['node','--check','cloudflare-worker-checkout-proxy.js'],
                       capture_output=True, text=True)
    if r.returncode:
        issues.append(f'SYNTAX  worker: {r.stderr.splitlines()[0] if r.stderr else "check failed"}')

if issues:
    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    print('❌ AUDIT FAILED — push blocked. Issues:')
    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    for i in issues:
        print(f'  {i}')
    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    print('Fix before pushing. To bypass in emergencies: git push --no-verify')
    sys.exit(1)

print('✅ Audit clean — booking flow healthy')
EOF
