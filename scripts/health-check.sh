#!/usr/bin/env bash
# Daily live-site health check for sabdastudio.com.
# Exits non-zero if any critical user path is broken. GitHub Actions reports
# the failure via email to the repo owner (same delivery channel as audit.yml).
#
# What this catches that audit.sh CANNOT:
#   - Live JS execution failures (orphan code, syntax errors that only fire
#     in real browsers — exactly what broke mobile schedule on commit 1171160)
#   - GitHub Pages CDN serving stale content
#   - Cloudflare Worker downtime or KV outage
#   - Momence readonly API returning empty / 5xx
#   - Stripe checkout proxy /sabda-api/health failing
#   - Third-party widget regressions (Stripe.js, Momence widget)
#
# What this does NOT catch (for a future health-check-v2):
#   - Real browser layout regressions (would need Playwright + visual diff)
#   - Slow page-load times (would need Lighthouse CI)
#   - Booking funnel completion rate (lives in Momence dashboard, not testable)

set -uo pipefail  # don't 'set -e' — we want to run all checks then summarize

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15"
MOBILE_UA="Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1"

PASS=0
FAIL=0
WARN=0
FAILURES=()
WARNINGS=()

# ─── Helpers ────────────────────────────────────────────────────────────────
fetch_to_file() {
  local ua="$1" url="$2" out_file="$3"
  local code i
  for i in 1 2 3 4 5; do
    code=$(curl -sS -A "$ua" -L --max-time 30 -o "$out_file" -w "%{http_code}" "$url" 2>/dev/null)
    local size=$(wc -c < "$out_file" 2>/dev/null || echo 0)
    if [[ "$code" =~ ^[23] && $size -gt 500 ]]; then
      echo "$code"
      return 0
    fi
    sleep 4
  done
  echo "$code"
}

check_url_200() {
  local label="$1" ua="$2" url="$3"
  local code
  code=$(fetch_to_file "$ua" "$url" /tmp/_health_body.txt)
  if [[ "$code" == "200" ]]; then
    echo "  ✅ $label  ($code)"
    PASS=$((PASS+1))
  else
    echo "  ❌ $label  ($code)"
    FAIL=$((FAIL+1))
    FAILURES+=("$label: HTTP $code  ($url)")
  fi
}

check_contains_small() {
  # Like check_contains but allows tiny bodies (e.g. {"ok":true} health endpoints)
  local label="$1" ua="$2" url="$3" needle="$4"
  local code size
  code=$(fetch_to_file "$ua" "$url" /tmp/_health_body.txt)
  size=$(wc -c < /tmp/_health_body.txt 2>/dev/null || echo 0)
  if [[ ! "$code" =~ ^[23] ]]; then
    echo "  ❌ $label  (HTTP $code)"
    FAIL=$((FAIL+1))
    FAILURES+=("$label: HTTP $code  ($url)")
    return 0
  fi
  if grep -qF "$needle" /tmp/_health_body.txt; then
    echo "  ✅ $label"
    PASS=$((PASS+1))
  else
    echo "  ❌ $label  (missing: $needle, body=$size bytes)"
    FAIL=$((FAIL+1))
    FAILURES+=("$label: response does not contain '$needle'  ($url)")
  fi
}

check_contains() {
  local label="$1" ua="$2" url="$3" needle="$4"
  local code size
  code=$(fetch_to_file "$ua" "$url" /tmp/_health_body.txt)
  size=$(wc -c < /tmp/_health_body.txt 2>/dev/null || echo 0)
  if [[ ! "$code" =~ ^[23] || $size -lt 1000 ]]; then
    echo "  ⚠️  $label  (fetch flaky: code=$code body=$size bytes)"
    WARN=$((WARN+1))
    WARNINGS+=("$label: fetch returned code=$code body=$size  ($url)")
    return 0
  fi
  if grep -qF "$needle" /tmp/_health_body.txt; then
    echo "  ✅ $label"
    PASS=$((PASS+1))
  else
    echo "  ❌ $label  (missing: $needle, body=$size bytes)"
    FAIL=$((FAIL+1))
    FAILURES+=("$label: page does not contain expected string '$needle'  ($url)")
  fi
}

check_not_contains() {
  local label="$1" ua="$2" url="$3" needle="$4"
  local code size
  code=$(fetch_to_file "$ua" "$url" /tmp/_health_body.txt)
  size=$(wc -c < /tmp/_health_body.txt 2>/dev/null || echo 0)
  if [[ ! "$code" =~ ^[23] || $size -lt 1000 ]]; then
    echo "  ⚠️  $label  (fetch flaky: code=$code body=$size bytes)"
    WARN=$((WARN+1))
    WARNINGS+=("$label: fetch returned code=$code body=$size  ($url)")
    return 0
  fi
  if grep -qF "$needle" /tmp/_health_body.txt; then
    echo "  ❌ $label  (unexpected: $needle)"
    FAIL=$((FAIL+1))
    FAILURES+=("$label: page contains forbidden string '$needle'  ($url)")
  else
    echo "  ✅ $label"
    PASS=$((PASS+1))
  fi
}

check_node_parses() {
  local label="$1" ua="$2" url="$3"
  local code script_count failed
  code=$(fetch_to_file "$ua" "$url" /tmp/_health_body.txt)
  if [[ ! "$code" =~ ^[23] ]]; then
    echo "  ⚠️  $label  (fetch failed: code=$code)"
    WARN=$((WARN+1))
    return 0
  fi
  python3 -c "
import re
t = open('/tmp/_health_body.txt').read()
scripts = re.findall(
    r'<script(?![^>]*\\bsrc=)(?![^>]*\\btype=\"application/ld\\+json\")[^>]*>(.*?)</script>',
    t, re.DOTALL | re.IGNORECASE,
)
for i, s in enumerate(scripts):
    s = s.strip()
    if not s: continue
    fn = f'/tmp/check_{i}.js'
    open(fn,'w').write(s)
    print(fn)
" > /tmp/script_files.txt
  failed=0
  while IFS= read -r fn; do
    if ! node --check "$fn" >/tmp/check_err.txt 2>&1; then
      failed=$((failed+1))
      WARNINGS+=("$label: inline script parse failure: $(head -2 /tmp/check_err.txt | tr '\n' ' ' | head -c 200)")
    fi
  done < /tmp/script_files.txt
  rm -f /tmp/check_*.js /tmp/script_files.txt
  if [[ $failed -eq 0 ]]; then
    echo "  ✅ $label  (all inline scripts parse)"
    PASS=$((PASS+1))
  else
    echo "  ❌ $label  ($failed inline script(s) failed parse)"
    FAIL=$((FAIL+1))
    FAILURES+=("$label: $failed inline script(s) failed Node parse")
  fi
}

# ─── Section 1: critical landing pages return 200 ───────────────────────────
echo ""
echo "━━━ Section 1: landing pages return HTTP 200 ━━━"
check_url_200 "Homepage EN"            "$UA"        "https://sabdastudio.com/"
check_url_200 "Homepage ES"            "$UA"        "https://sabdastudio.com/es/"
check_url_200 "Homepage CA"            "$UA"        "https://sabdastudio.com/ca/"
check_url_200 "Pricing EN"             "$UA"        "https://sabdastudio.com/pricing.html"
check_url_200 "Pricing ES"             "$UA"        "https://sabdastudio.com/es/precios/"
check_url_200 "Pricing CA"             "$UA"        "https://sabdastudio.com/ca/preus/"
check_url_200 "Intro EN (ad landing)"  "$UA"        "https://sabdastudio.com/intro/"
check_url_200 "Intro ES"               "$UA"        "https://sabdastudio.com/es/intro/"
check_url_200 "Intro CA"               "$UA"        "https://sabdastudio.com/ca/intro/"
check_url_200 "Schedule desktop"       "$UA"        "https://sabdastudio.com/schedule.html"
check_url_200 "Schedule mobile"        "$MOBILE_UA" "https://sabdastudio.com/m/schedule.html"
check_url_200 "Mobile homepage"        "$MOBILE_UA" "https://sabdastudio.com/m/index.html"
check_url_200 "Classes EN"             "$UA"        "https://sabdastudio.com/classes.html"
check_url_200 "Classes/yoga EN"        "$UA"        "https://sabdastudio.com/classes/yoga/"

# ─── Section 2: pages contain expected critical strings ─────────────────────
echo ""
echo "━━━ Section 2: critical content present ━━━"
check_contains "Homepage links to pricing"       "$UA"        "https://sabdastudio.com/"            "pricing.html"
check_contains "Pricing has 3-pack offer"        "$UA"        "https://sabdastudio.com/pricing.html" "momence.com/m/443935"
check_contains "Intro has trial pack offer"      "$UA"        "https://sabdastudio.com/intro/"      "momence.com/m/443934"
check_contains "Schedule loads Momence widget"   "$UA"        "https://sabdastudio.com/schedule.html" "momence-plugin-host-schedule"
check_contains "Mobile schedule has init code"   "$MOBILE_UA" "https://sabdastudio.com/m/schedule.html" "async function init"
check_contains "v2 passthrough module present"   "$UA"        "https://sabdastudio.com/intro/"      "SABDA-MOMENCE-PASSTHROUGH-v2"
check_contains "Pixel base code present"         "$UA"        "https://sabdastudio.com/intro/"      "567636669734630"
check_contains "GA4 tag present"                 "$UA"        "https://sabdastudio.com/"            "G-1E1WXTZWQD"

# ─── Section 3: no regression markers on live pages ─────────────────────────
echo ""
echo "━━━ Section 3: no regression markers in live pages ━━━"
check_not_contains "No raw JS visible on intro EN" "$UA" "https://sabdastudio.com/intro/" 'function _fbGetCookie</body>'
# Check that mobile schedule renders the skeleton container (means HTML structure intact).
# Don't check for "Could not load" — that string is in JS as a fallback message and matching
# it triggers false positives. Real "schedule failed to render" detection would need
# headless browser; this is best we can do at HTTP level.
check_contains "Mobile schedule has skeleton container" "$MOBILE_UA" "https://sabdastudio.com/m/schedule.html" 'id="sched"'

# ─── Section 4: live JS parse-check (catches orphan-code style bugs) ────────
echo ""
echo "━━━ Section 4: live inline-script parse validation ━━━"
check_node_parses "Mobile schedule scripts parse" "$MOBILE_UA" "https://sabdastudio.com/m/schedule.html"
check_node_parses "Intro page scripts parse"      "$UA"        "https://sabdastudio.com/intro/"
check_node_parses "Pricing page scripts parse"    "$UA"        "https://sabdastudio.com/pricing.html"
check_node_parses "Mobile homepage scripts parse" "$MOBILE_UA" "https://sabdastudio.com/m/index.html"
check_node_parses "Classes page scripts parse"    "$UA"        "https://sabdastudio.com/classes.html"

# ─── Section 5: backend infrastructure ──────────────────────────────────────
echo ""
echo "━━━ Section 5: backend infrastructure ━━━"
check_url_200 "Cloudflare Worker /health"          "$UA" "https://sabda-checkout-proxy.sabda.workers.dev/sabda-api/health"
check_contains_small "Worker /health returns ok:true"    "$UA" "https://sabda-checkout-proxy.sabda.workers.dev/sabda-api/health" '"ok":true'
check_url_200 "Momence schedule readonly API"      "$UA" "https://momence.com/_api/primary/api/v1/Events?hostId=54278&token=a0314a80ca"

# ─── Section 6: anchor target sanity (ad-flow links should match Test A state) ─
echo ""
echo "━━━ Section 6: anchor target attribute sanity ━━━"
fetch_to_file "$UA" "https://sabdastudio.com/pricing.html" /tmp/_health_body.txt > /dev/null
SELF_COUNT=$(grep -oE 'href="https://momence\.com/m/[0-9]+"[^>]*target="_self"' /tmp/_health_body.txt | wc -l)
BLANK_COUNT=$(grep -oE 'href="https://momence\.com/m/[0-9]+"[^>]*target="_blank"' /tmp/_health_body.txt | wc -l)
GIFT_COUNT=$(grep -oE 'href="https://momence\.com/SABDA/gift-card[^"]*"[^>]*target="_blank"' /tmp/_health_body.txt | wc -l)
echo "  pricing.html: pack target=_self=$SELF_COUNT  pack target=_blank=$BLANK_COUNT  gift target=_blank=$GIFT_COUNT"
# For now, sanity rule: as long as gift cards stay _blank=6, that's fine.
# Pack anchors can be _self (Test A active) or _blank (post-revert) — both valid states.
if [[ $GIFT_COUNT -eq 0 ]]; then
  echo "  ⚠️  pricing.html: gift card anchors expected target=_blank but found 0"
  WARN=$((WARN+1))
  WARNINGS+=("pricing.html gift card target=_blank count is 0 (expected 6+) — gift card flow may be misconfigured")
else
  echo "  ✅ Gift card anchor target attribute sane"
  PASS=$((PASS+1))
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: $PASS passed, $FAIL failed, $WARN warnings"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ ${#FAILURES[@]} -gt 0 ]]; then
  echo ""
  echo "❌ FAILURES:"
  for f in "${FAILURES[@]}"; do
    echo "  - $f"
  done
fi

if [[ ${#WARNINGS[@]} -gt 0 ]]; then
  echo ""
  echo "⚠️  WARNINGS (non-blocking):"
  for w in "${WARNINGS[@]}"; do
    echo "  - $w"
  done
fi

if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "🛑 Health check FAILED — see failures above."
  echo "GitHub Actions will email the repo owner about this run."
  exit 1
fi

echo ""
echo "✅ All critical paths healthy."
exit 0
