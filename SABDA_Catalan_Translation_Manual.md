# SABDA Catalan Localization Manual
**For: the next chat session that picks up Catalan (CA) localization**
**Compiled: April 9, 2026, after the Spanish (ES) i18n workstream closed**
**Author: Claude (the previous chat instance), after 27 commits and ~1,070 string fixes**

This manual exists because the Spanish localization took **way more turns than it should have** due to repeated methodology mistakes. Read this in full before touching any Catalan files. It will save you several days of back-and-forth.

---

## TL;DR — the 5 things that matter most

1. **Build the audit BEFORE the translation work, not after.** The Spanish session ran "audits" 8 times before catching everything because each audit was structurally blind to a different surface. The full audit script (Q1-Q7) is in this repo at `/home/claude/audit_comprehensive.py` and `/home/claude/audit_text_nodes.py`. **Use them from turn 1.**

2. **NEVER translate JavaScript identifiers, method names, property names, or CSS class names.** This is the #1 cause of silent breakage. The Spanish session corrupted 16 JS identifiers in `es/clases/index.html` (e.g. `getDay()` → `getDía()`, `dateTime` → `dateHora`, `isWaitlist:` → `isLista de espera:`) which caused the booking modal to crash on parse. The fix took 2 dedicated sessions and could have been avoided entirely.

3. **Translate text content only. Leave code alone.** When in doubt, ask: "is this string visible to the user, or is it consumed by code?" If consumed by code (a property key, a class name, an event name, an API field), do not touch it.

4. **`node --check` after every translation pass.** If JS doesn't parse, the page is broken even if curl returns 200. The Spanish booking modal was likely broken on production for days because nobody validated JS syntax until the very end.

5. **Read this whole document first. Don't skip ahead.** Every section contains a lesson learned the hard way.

---

## Part 1: The exact file list (37 files)

These are all the Spanish files. The Catalan structure should mirror this exactly under `/ca/` instead of `/es/`. **Copy this list verbatim into your tracking — do not try to derive it.**

### 1.1 Desktop pages (17 files)
```
es/index.html                              -> ca/index.html
es/clases/index.html                       -> ca/classes/index.html         (note: classes, not clases)
es/clases/yoga/index.html                  -> ca/classes/yoga/index.html
es/clases/pilates/index.html               -> ca/classes/pilates/index.html
es/clases/breathwork/index.html            -> ca/classes/breathwork/index.html
es/clases/sound-healing/index.html         -> ca/classes/sound-healing/index.html
es/clases/ice-bath/index.html              -> ca/classes/ice-bath/index.html
es/clases/ecstatic-dance/index.html        -> ca/classes/ecstatic-dance/index.html
es/precios/index.html                      -> ca/preus/index.html
es/sobre/index.html                        -> ca/sobre/index.html
es/alquiler/index.html                     -> ca/lloguer/index.html
es/eventos/index.html                      -> ca/esdeveniments/index.html
es/contacto/index.html                     -> ca/contacte/index.html
es/faq/index.html                          -> ca/faq/index.html
es/team-building/index.html                -> ca/team-building/index.html
es/experiencia-inmersiva/index.html        -> ca/experiencia-immersiva/index.html
es/schedule.html                           -> ca/schedule.html              (or ca/horari.html)
```

### 1.2 Mobile pages (16 files — `es/m/` → `ca/m/`)
```
es/m/index.html         -> ca/m/index.html
es/m/about.html         -> ca/m/about.html
es/m/classes.html       -> ca/m/classes.html
es/m/pricing.html       -> ca/m/pricing.html
es/m/schedule.html      -> ca/m/schedule.html
es/m/contact.html       -> ca/m/contact.html
es/m/faq.html           -> ca/m/faq.html
es/m/events.html        -> ca/m/events.html
es/m/hire.html          -> ca/m/hire.html
es/m/blog.html          -> ca/m/blog.html
es/m/yoga.html          -> ca/m/yoga.html
es/m/pilates.html       -> ca/m/pilates.html
es/m/breathwork.html    -> ca/m/breathwork.html
es/m/sound-healing.html -> ca/m/sound-healing.html
es/m/ice-bath.html      -> ca/m/ice-bath.html
es/m/ecstatic-dance.html -> ca/m/ecstatic-dance.html
```

**IMPORTANT**: The mobile `es/m/` paths kept English filenames (`pricing.html`, not `precios.html`). This was a deliberate decision to avoid cross-linking complexity. Ask Marvyn if Catalan should follow the same pattern (recommended) or use Catalan filenames (more work, more consistent).

### 1.3 Legal pages (4 files)
```
es/legal/aviso-legal.html         -> ca/legal/avis-legal.html
es/legal/cookies.html             -> ca/legal/cookies.html
es/legal/politica-privacidad.html -> ca/legal/politica-privacitat.html
es/legal/terminos.html            -> ca/legal/termes.html
```

**WARNING**: These legal pages are still pending lawyer review even for Spanish. Marvyn removed the "Aviso: Traducción al español pendiente de revisión jurídica profesional" disclaimer banners on April 9, 2026 (commit `e8c187d`) — but the underlying review is still outstanding. Catalan legal pages should probably get the same treatment: translate, then leave a note for Marvyn that lawyer review is pending. Do NOT add the disclaimer banner — Marvyn explicitly asked for them removed.

### Total: 37 files. Sanity check before committing: `find ca -name '*.html' | wc -l` → must equal 37 (not counting any stragglers).

---

## Part 2: Critical mistakes from the Spanish session — DO NOT REPEAT

### Mistake #1: Translating JavaScript identifiers (P0 — broke production)

**What happened**: An early translation pass used a global find-and-replace for visible text like:
- `Day` → `Día`
- `Time` → `Hora`
- `Today` → `Hoy`
- `Waitlist` → `Lista de espera`

This broke `es/clases/index.html` in 16 places:

```javascript
// CORRUPTED (booking modal broken — would not even parse):
function renderDías() { ... }                     // was renderDays
function selDía(b, ds) { ... }                    // was selDay
var madridDía = new Date(...);                    // was madridDate
.toLocaleHoraString('en-GB', ...)                 // INVALID JS API method
.getDía()                                         // INVALID Date method
.getHora()                                        // INVALID Date method
e.dateHora                                        // wrong Momence API property
{ isLista de espera: false }                      // SYNTAX ERROR (spaces in object key)
{ allowLista de espera: e.allowLista de espera }  // SYNTAX ERROR
```

**Why it was so bad**: `isLista de espera:` is a JavaScript syntax error. The entire `<script>` block would have failed to parse, meaning the booking modal could not even open on `/es/clases/`. **Spanish users could not book classes for several days.**

**How to avoid**:

1. **Never use global find-and-replace for translation.** Always work on individual visible-text strings, surgically.
2. **Before any "translate Day to Día" pass, run this check first:**
   ```bash
   grep -n "Day\|Time\|Today\|Waitlist\|Date" file.html | head -50
   ```
   Look at every match. If the match is inside `<script>` (not in user-visible text), leave it alone. Method names like `.getDay()`, property names like `dateTime`, function names like `renderDays`, and CSS class names like `today` are all off-limits.
3. **After every translation pass, run `node --check`** on every script block in the file. Steps:
   ```python
   import re, subprocess
   s = open('ca/classes/index.html').read()
   scripts = re.findall(r'<script[^>]*>(.*?)</script>', s, flags=re.S|re.I)
   for i, js in enumerate(scripts):
       if not js.strip() or js.strip().startswith(('{','[')): continue
       open('/tmp/v.js','w').write(js)
       r = subprocess.run(['node','--check','/tmp/v.js'], capture_output=True, text=True)
       if r.returncode != 0:
           print(f"  ❌ script[{i}]: {r.stderr[:200]}")
   ```
4. **Same for JSON-LD blocks** — use `json.loads()` to validate. Schema.org property names like `acceptedAnswer`, `openingHoursSpecification`, `EntertainmentBusiness` must NEVER be translated.

### Mistake #2: Sentence-based audit blind to short phrases (cost ~10 turns)

**What happened**: I built an audit that split body text on `[.!?]` punctuation and looked for English words in each "sentence". This was structurally blind to short phrases inside `<span>`, badges, button text, stat callouts, microcopy.

The screenshot from Marvyn showed `"ClassPass · 15,000+ reviews"` rendering as visible English on the live ES homepage. My audits never caught it because:

1. The text was inside `<span class="tlbl">` (single text node)
2. The text was concatenated by my regex with adjacent Spanish text from another `<span>`
3. The presence of "ClassPass" (already in my whitelist) plus the Spanish from the adjacent span tricked the "has Spanish marker" check

**How to avoid**:

Build your audit with these surfaces from turn 1:

1. **Text nodes** — split on every separator commonly used in microcopy: `·`, `•`, `|`, `—`, `-`. Audit each fragment independently. Use word-boundary regex (`\bword\b`), not substring matching.
2. **Attribute values** — `aria-label`, `alt`, `placeholder`, `title`, `data-*` attributes. These are user-facing.
3. **Input/button text** — `<input value="...">`, `<button>...</button>`.
4. **JS string literals** — single-line strings inside `<script>` blocks. Filter out CSS selectors, URLs, identifiers (no whitespace).
5. **JSON-LD strings** — for visible Schema.org fields like `name`, `description`, `text`, `headline`. These ARE user-facing in search results.

The Spanish session ended up with ~62 user-facing English residuals after the first "all clean" verdict. Don't repeat this. **Build the audit script before you start translating.**

### Mistake #3: Substring matching false positives (cost ~3 turns)

**What happened**: After building the text-node audit, I used substring matching like `if 'cancel' in lower:` to flag English. This false-positived on Spanish words containing those substrings:
- `Cancela cuando quieras` (Spanish: "Cancel whenever") → flagged because "cancel" is a substring
- `Cancelaciones` (Spanish: "Cancellations") → same
- `removePromo()` (JS function name) → flagged because "remove" is a substring

**How to avoid**: Use word-boundary regex (`\bcancel\b`) and only match against complete English phrases, not substrings. For Catalan, the false-positive risk is even higher because Catalan shares many substrings with English (`cancel·lar`, `informació`, `descripció`, etc.).

### Mistake #4: Not validating against the actual EN source

**What happened**: I sometimes translated based on what I thought the page should say, not what the EN page actually says. This caused minor drift.

**How to avoid**: For every CA page you create, **always reference the EN source** (`/index.html`, `/classes/index.html`, etc.). The CA page is a translation of the EN page, not the ES page. If you copy from ES, you'll inherit any ES drift.

The right workflow:
1. Read the EN source file end to end
2. Read the ES file to understand how loanwords/branding were handled
3. Write CA from the EN source, using ES as reference for tone

### Mistake #5: Not testing the booking modal in browser

**What happened**: I never simulated clicking through the booking flow on the live site. I only validated HTML/JS syntax. The modal could have been broken in subtle ways (state machine bugs, async race conditions) that no syntax check would catch.

**How to avoid**: After your CA work, ask Marvyn (or a native Catalan speaker) to:
1. Open `https://sabdastudio.com/ca/classes/` in Chrome
2. Open dev console (F12)
3. Click on a class card to open the booking modal
4. Step through: select class → enter email → enter password → enter card → submit
5. Look for any JS errors in console
6. **Optional but recommended**: actually complete a real €1 test transaction (Marvyn can refund it)

---

## Part 3: The audit script you should build on turn 1

Save these two files to `/home/claude/` at the start of the Catalan session. Run them after every translation pass.

### `/home/claude/audit_ca.py`

```python
#!/usr/bin/env python3
"""
Catalan translation audit. 7 surfaces. Run after every pass.

Surfaces:
Q1: HTTP 200 on every CA page (live)
Q2: Internal links from CA pages (live)
Q3: EN -> CA structural parity
Q4: Hreflang symmetry on critical pages
Q5: JS + JSON-LD validity (node --check + json.loads)
Q6: Text-node + attribute + JS string + JSON-LD string audit (word-boundary)
Q7: JS identifier corruption (no .getDia, .getHora, dateHora, etc.)
"""

import re, subprocess, pathlib, json
from urllib.parse import urljoin

ROOT = pathlib.Path('/home/claude/sabdawebsite')
BASE = 'https://sabdastudio.com'

CA_FILES = sorted(ROOT.glob('ca/**/*.html'))
print(f"Auditing {len(CA_FILES)} CA pages\n" + "="*70)

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

# ── Q6: Text-node audit (word-boundary, separator-aware) ──
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
# Catalan vowels with diacritics — if present, the text is Catalan
CA_CHARS = re.compile(r'[àèéíïòóúüçÀÈÉÍÏÒÓÚÜÇ]')

def is_real_en(text):
    if not text or len(text) < 4: return False
    if CA_CHARS.search(text): return False  # Has Catalan diacritics → not English
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
    # Text nodes — separator-aware splitting
    for n in re.split(r'<[^>]+>', body):
        for frag in re.split(r' [·•|—-]\s|\s[·•|—-] ', n.strip()):
            frag = frag.strip()
            if is_real_en(frag):
                findings.append(('text', frag[:100]))
    # Attribute values
    for attr in ['aria-label','alt','placeholder','title','data-tooltip']:
        for m in re.finditer(rf'\b{attr}="([^"]+)"', html):
            if is_real_en(m.group(1)):
                findings.append((attr, m.group(1)[:100]))
    # JS string literals (single-line, length 4-150)
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, flags=re.S|re.I)
    for js in scripts:
        if js.strip().startswith(('{','[')): continue
        for m in re.finditer(r"'([^'\n]{4,150})'", js):
            v = m.group(1).strip()
            if is_real_en(v):
                findings.append(('js', v[:100]))
    return findings

# ── Q7: JS identifier corruption check ──
CORRUPT = [
    r'\.getDia\b', r'\.getHora\b', r'\.getMes\b', r'\.getAny\b',  # Catalan equivalents
    r'\.toLocaleHoraString\b', r'\.toLocaleDataString\b',
    r'\bdataHora\b', r'\bdateHora\b',
    r'\bisLlista d\'espera\b', r'\ballowLlista d\'espera\b',
    # Spanish leftovers (in case anyone confuses ES/CA)
    r'\.getDía\b', r'\bisLista de espera\b', r'\ballowLista de espera\b',
]

# Run all checks
total_issues = 0
for p in CA_FILES:
    rel = str(p.relative_to(ROOT))
    issues = []
    
    js_issues = validate_js_jsonld(p)
    if js_issues:
        issues.extend([('Q5_JS', *x) for x in js_issues])
    
    text_issues = text_audit(p)
    if text_issues:
        issues.extend([('Q6_text', *x) for x in text_issues])
    
    s = p.read_text()
    for pat in CORRUPT:
        if re.search(pat, s):
            issues.append(('Q7_id', pat))
    
    if issues:
        print(f"\n{rel}")
        for issue in issues[:10]:
            print(f"  {issue}")
        total_issues += len(issues)

print(f"\n{'='*70}")
print(f"Total issues: {total_issues}")
```

**Run it**: `python3 /home/claude/audit_ca.py`

If it returns 0 issues across all 37 pages, you're actually done. If not, fix and re-run.

---

## Part 4: Catalan-specific translation rules

### 4.1 Brand voice (same as ES — non-negotiable)
- Clever, witty, thought-provoking, down-to-earth
- **NEVER**: woo-woo, esoteric, hippie, basic, "wellness guru" tone
- No em-dashes anywhere
- Never mention reformer pilates, yoga nidra, or standalone meditation
- "2026" year markers stay (SEO freshness)

### 4.2 Loanwords kept in English (these are SABDA brand vocabulary)
```
sound healing       (NOT "guarició sonora")
breathwork          (NOT "treball respiratori")
ice bath            (NOT "bany de gel")
ecstatic dance      (NOT "dansa extàtica")
listening session   (NOT "sessió d'escolta")
workshop            (sometimes "taller" works in Catalan, but check ES — if ES kept "workshop", CA keeps "workshop")
team building       (NOT "construcció d'equip")
offsite             (NOT "fora del lloc")
vinyasa             (always English)
pilates             (always — same in Catalan anyway)
breathwork          (always English)
flex / ritual / immerse  (membership tier names — never translate)
```

**Why**: SABDA's brand identity uses these as English loanwords across all languages. Translating them sounds amateur and breaks brand consistency. The Spanish session learned this the hard way after I translated "ice bath" to "baño de hielo" and Marvyn corrected me.

### 4.3 Catalan dialect — Central Catalan (Barcelona)
- Use **vosaltres** (not "vós") for "you all"
- Use **us** as second-person plural pronoun
- Standard Catalan orthography (not Valencian or Balearic variants)
- Numbers: European format (1.000 thousands separator, 1,5 decimal — same as Spanish)
- Currency: €50, not $50

### 4.4 Gender-neutral language
- Use "persona usuària" instead of "usuari"
- Use "professorat" instead of "els professors"
- Masculine plural is acceptable as a neutral fallback when needed
- Same approach as the Spanish session

### 4.5 Common Catalan translation traps

| English | ❌ Wrong | ✅ Right |
|---|---|---|
| "Cancel" (button) | "Cancel·lació" (noun) | "Cancel·la" (imperative) |
| "Submit" | "Sotmetre" | "Envia" |
| "Loading..." | "Càrrega..." | "Carregant..." |
| "Sign in" | "Iniciar sessió" (Spanish-ism) | "Inicia sessió" |
| "Free" (no cost) | "Lliure" | "Gratuït" |
| "Free" (vacant) | "Gratuït" | "Lliure" |
| "Welcome" | "Benvingut" (only masculine) | "Us donem la benvinguda" (gender-neutral) |
| "Discover" | "Descobrir" | "Descobreix" (imperative) |
| "Today" | "Hoy" (Spanish slip) | "Avui" |
| "Day" | "Día" (Spanish slip) | "Dia" (note: NO accent in Catalan) |
| "Time" | "Hora" | "Hora" (same — but never as JS identifier) |
| "Class" (lesson) | "Classe" | "Classe" (same) |
| "Schedule" | "Horario" (Spanish) | "Horari" |
| "Booking" | "Reservación" (Spanish) | "Reserva" |
| "Price" | "Precio" (Spanish) | "Preu" |

### 4.6 Catalan apostrophes — danger zone for JS

Catalan uses apostrophes heavily: `l'experiència`, `d'aquí`, `s'ha`. These will **break JavaScript string literals** if used inside single-quoted strings without escaping.

**Wrong** (JS parse error):
```javascript
btn.textContent='L'experiència';  // breaks at the second '
```

**Right**:
```javascript
btn.textContent='L\'experiència';   // escaped
btn.textContent="L'experiència";    // double quotes
btn.textContent=`L'experiència`;    // template literal
```

When you do find-and-replace from English to Catalan, **always check that you didn't introduce unescaped apostrophes inside JS strings**. Run `node --check` after every pass.

### 4.7 Catalan special characters that need careful handling
- `ç` (c-cedilla)
- `ï`, `ü` (diaeresis)
- `·` (mid-dot, used in `cancel·lar`, `il·legal`, `paral·lel`)
- `l·l` (geminated L, e.g. `cancel·lar`, `intel·ligent`)

**WARNING about `·`**: This is the same Unicode character (`U+00B7`) that the SABDA design uses as a separator in stat callouts (`60 MIN · TODOS LOS NIVELES`). My Catalan audit script splits text on `·` for separator-aware scanning. **The geminated L (`l·l`) will trip this** — it might split `cancel·lar` into `cancel` and `lar` and miss it. Adjust the split regex to not break inside word characters:

```python
# Split on ' · ' (space-dot-space) only, not bare ·
re.split(r' [·•|]\s|\s[·•|] ', node)
```

That regex requires whitespace around the separator, which protects `cancel·lar` (no spaces).

---

## Part 5: The optimal workflow (use this exactly)

### Phase 0: Setup (turn 1)
1. `git pull` to sync repo
2. Save the audit script from Part 3 to `/home/claude/audit_ca.py`
3. Run audit on existing CA files: `python3 /home/claude/audit_ca.py` — should report `0 files found` if `/ca/` doesn't exist yet
4. Create `/ca/` directory structure: `mkdir -p ca/{classes/{yoga,pilates,breathwork,sound-healing,ice-bath,ecstatic-dance},preus,sobre,lloguer,esdeveniments,contacte,faq,team-building,experiencia-immersiva,legal,m}`
5. Confirm with Marvyn the Catalan URL slugs (this manual proposes `preus`, `sobre`, `lloguer`, `esdeveniments`, `contacte`, `experiencia-immersiva` — but he should sign off before you create files)

### Phase 1: Translate one page end-to-end as a template (turn 2)
1. Start with `ca/index.html` (homepage)
2. Read `index.html` (EN source) end-to-end
3. Read `es/index.html` (ES reference) for branding decisions
4. Copy `index.html` to `ca/index.html` as starting point
5. Translate visible text only — leave all JS, CSS, HTML structure alone
6. Update language switcher: `<a href="../">EN</a><a href="/es/">ES</a><a href="#" class="active">CA</a>`
7. Add hreflang tags pointing to EN and ES equivalents
8. Run `node --check` on every script block
9. Run audit script
10. Commit + push
11. Verify live: `curl -s https://sabdastudio.com/ca/?vfix | grep -c 'lang="ca"'`

This first page sets the pattern for all 36 others.

### Phase 2: Bulk translate desktop pages (turns 3-8)
- One page per turn, same workflow as Phase 1
- After each page: audit, commit, push, verify
- Order: `index` → `classes/` → `preus` → `sobre` → `lloguer` → `esdeveniments` → `contacte` → `faq` → `team-building` → `experiencia-immersiva` → `schedule`
- Then class subpages: `classes/yoga`, `classes/pilates`, `classes/breathwork`, `classes/sound-healing`, `classes/ice-bath`, `classes/ecstatic-dance`

### Phase 3: Mobile pages (turns 9-12)
- All 16 `ca/m/*` pages
- These are usually shorter than desktop equivalents — can do 4-5 per turn
- Same workflow

### Phase 4: Legal pages (turn 13)
- 4 pages
- Translate content
- Do NOT add any "translation pending review" disclaimer banner (Marvyn explicitly removed these for Spanish)
- Note in the commit message that lawyer review of CA legal pages is pending

### Phase 5: Sitemap, hreflang, language switcher (turn 14)
- Update `sitemap.xml` to include all 37 new CA URLs
- Update language switcher on EN and ES pages to make CA link active (currently `<a href="#">CA</a>` placeholder)
- Add hreflang tags on EN and ES pages pointing to CA equivalents
- Verify hreflang symmetry across all critical pairs

### Phase 6: Final audit (turn 15)
- Run full Q1-Q7 audit
- Fix any residuals
- Commit + push
- Verify live
- Hand off to Marvyn for browser testing

**Total expected: 15 turns max** — IF you follow this workflow strictly. The Spanish session took 27 turns because of the methodology mistakes documented above.

---

## Part 6: Things that already exist and you should NOT redo

### 6.1 CA placeholder in language switcher
Every page already has `<a href="#">CA</a>` as a placeholder. You'll update these to `<a href="/ca/">CA</a>` (and the equivalent on subpages) once `ca/` exists.

### 6.2 EN+ES are stable
The Spanish session is closed as of commit `e8c187d`. Don't touch ES files unless Marvyn asks. Don't touch EN files for Catalan work — only update language switcher and hreflang.

### 6.3 The booking modal fix
`es/clases/index.html` had its booking modal JavaScript restored in commit `4148a44`. The Catalan equivalent (`ca/classes/index.html`) should be created from the **English source**, not the Spanish file. The Spanish file is now correct, but starting from EN avoids any chance of inheriting historical drift.

### 6.4 The cursor was removed
Custom SABDA-symbol cursor was removed from EN (`index.html`, `hire.html`, `events.html`) and ES (`es/index.html`, `es/alquiler/index.html`, `es/eventos/index.html`) on April 9, 2026. **Catalan pages should NOT include the cursor CSS, DOM, or JS.** When you copy from EN as a starting point, the cursor is already gone. If you copy from an old version somewhere, double-check.

---

## Part 7: Things to ask Marvyn BEFORE starting

1. **URL slugs for Catalan**: my proposed slugs (`preus`, `sobre`, `lloguer`, `esdeveniments`, `contacte`, `experiencia-immersiva`) need his approval. He may prefer different ones for SEO reasons.
2. **Mobile filenames**: keep English (`pricing.html`, `hire.html`) like ES does, or use Catalan (`preus.html`, `lloguer.html`)?
3. **Legal pages**: translate all 4 now, or wait until lawyer reviews ES first?
4. **Catalan-specific content variations**: any blog posts, events, or class names that should differ between ES and CA? (Spanish has 60 blog articles split 19/38/3 EN/ES/CA — only 3 are Catalan. Marvyn may have a specific Catalan content strategy.)
5. **Resource for Catalan QA**: who's the native Catalan speaker who'll walk the booking flow before launch?
6. **Hreflang strategy**: does CA point to itself only, or does it also reference Catalan-specific GBP listing for `ca-ES`?

---

## Part 8: Critical security reminders

🔴 **GitHub PAT** has been exposed across many sessions and is overdue for rotation. The previous chat used a token starting with `github_pat_11B6KC5...` extensively. Ask Marvyn to confirm rotation is complete and get a fresh token before any push work.

🔴 **Cloudflare API token** also exposed.

🔴 **sabdastudio.com domain renewal** — was urgent as of April 9, 2026 with 12 days to expiry (April 21). Verify renewal is complete before doing any work.

---

## Part 9: Repo state at handoff (April 9, 2026)

Recent commits in chronological order:
```
e8c187d  browser fixes from screenshots: ice bath img, legal banners, cursor (ES + EN cursor removal)
dedbfca  i18n FIX: 6 final residuals from final audit v3
4148a44  i18n CRITICAL: restore broken JS + 4 final text strings in es/clases/
99ec8f0  i18n FIX: 42 more residuals (booking modal + form states + alt + aria)
057f6c2  i18n FIX: 20 short-phrase residuals caught by text-node audit
cea0b65  i18n FIX: es/contacto/ footer straggler
2a10156  i18n NEW PAGE: es/experiencia-inmersiva/ + sitemap
1b2f135  i18n NEW PAGE: es/team-building/
71c3626  i18n NEW PAGE: es/faq/
df50674  i18n NEW PAGE: es/contacto/
a7e2cae  i18n LEGAL: Spanish translation of all 4 ES legal pages
... (16 more i18n commits, all stable)
```

**Spanish status**: 37/37 pages live, all 7 audit checks PASS, booking modal verified working in JS validation. Pending only native-speaker browser QA.

**Catalan status**: 0 files exist. Language switcher placeholder in place. Ready to start.

---

## Part 10: One-page cheat sheet

Print this and tape it next to your monitor:

```
┌─────────────────────────────────────────────────────────────────────┐
│ CATALAN TRANSLATION CHEAT SHEET                                     │
├─────────────────────────────────────────────────────────────────────┤
│ NEVER TRANSLATE:                                                    │
│   - JS function names      (renderDays, selDay, fmtTime)            │
│   - JS Date methods        (.getDay(), .getTime(), .toLocale*)      │
│   - JS object property keys (dateTime, isWaitlist, allowWaitlist)   │
│   - CSS class names         (.cursor, .bk-primary, .nav-link)       │
│   - Schema.org JSON-LD keys (acceptedAnswer, openingHoursSpec...)   │
│   - HTML id attributes      (id="C", id="CR", id="bk-pay-btn")     │
│   - URL slugs unless approved by Marvyn                             │
│   - Brand loanwords (sound healing, breathwork, ice bath, etc.)     │
├─────────────────────────────────────────────────────────────────────┤
│ DO TRANSLATE:                                                       │
│   - Visible body text (between tags)                                │
│   - aria-label, alt, placeholder, title attribute values            │
│   - <input value="..."> and <button>...</button>                    │
│   - JS strings INSIDE template literals or .textContent assignments │
│     (but only the user-facing portion, not the variable names)      │
│   - Schema.org user-facing fields: name, description, headline      │
├─────────────────────────────────────────────────────────────────────┤
│ AFTER EVERY PASS:                                                   │
│   1. python3 /home/claude/audit_ca.py                               │
│   2. node --check on every script block                             │
│   3. json.loads on every JSON-LD block                              │
│   4. git diff to verify only intended changes                       │
│   5. commit + push + sleep 65 + curl verify                         │
├─────────────────────────────────────────────────────────────────────┤
│ APOSTROPHE TRAP:                                                    │
│   Catalan: l'experiència, d'aquí, s'ha                              │
│   In JS strings: ALWAYS escape (\') or use double quotes/backticks  │
│   After find-and-replace: ALWAYS run node --check                   │
├─────────────────────────────────────────────────────────────────────┤
│ TOTAL FILES: 37 (same as ES)                                        │
│   - 17 desktop                                                      │
│   - 16 mobile (es/m/ -> ca/m/)                                      │
│   - 4 legal                                                         │
│ Sanity check: find ca -name '*.html' | wc -l                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Final words from the previous chat

The Spanish session took 27 commits and probably 15+ hours of Marvyn's time across multiple sessions. **Most of that pain came from skipping the audit script step.** I built audits reactively, after each "discovery" of a new failure mode. By the time the audit was actually comprehensive, I'd shipped broken code 3 times.

**Don't do that. Build the audit on turn 1. Run it after every change. If it doesn't catch something, improve it before making the next change.**

The Catalan session should be much faster than the Spanish one because:
1. You have this manual
2. You have a working audit script
3. You have a clean repo to start from
4. You know exactly which JS/CSS surfaces NOT to touch
5. The directory structure and language switcher placeholders already exist

Good luck. Be surgical. Validate everything.

— Claude (April 9, 2026, after the Spanish workstream closed)
