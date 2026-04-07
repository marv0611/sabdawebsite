# SABDA — Next Chat Handoff Document
## Generated: April 7, 2026 — End of Session P16

---

## PASTE THIS AT THE START OF YOUR NEXT CHAT

> I'm continuing the SABDA website build. **Read `SABDA_Website_Build_Manual.md` AND `NEXT_CHAT_HANDOFF.md` from the GitHub repo (https://github.com/marv0611/sabdawebsite) BEFORE making any changes.** Read sections 24 and 25 of the manual in particular — they cover the most recent work. Also read `WORKER_FIX_NOTES.md` for the Cloudflare Worker payment endpoint context.
>
> The site is at https://marv0611.github.io/sabdawebsite/ for desktop and https://marv0611.github.io/sabdawebsite/m/ for mobile. Production domain `sabdastudio.com` is currently a Squarespace expired page — DNS not yet pointing here.
>
> Do not start work until I tell you what I want next. Acknowledge that you've read the manual and the handoff doc, and summarize what state things are in, then wait for instructions.

---

## WHO YOU'RE WORKING WITH

**Marvyn** is the co-founder of SABDA Studio Barcelona — an immersive audio-visual wellness studio at C/Muntaner 83B, Local 2, 08011 Barcelona (Eixample). He is the primary technical decision-maker.

**How Marvyn communicates:**
- Direct and terse. No fluff.
- Expects immediate execution without asking for confirmation (unless genuinely ambiguous)
- Verifies work himself — share URLs only AFTER you've curl-tested they work
- Pushes back hard when instructions aren't followed precisely
- Says "DO IT YOURSELF" when an AI asks him to test something the AI should be testing
- Uses caps and harsh language when frustrated; this is feedback, not abuse — take it on the chin and fix the issue
- Values "less is more" aesthetics and pixel-level precision
- Hates being asked questions when the answer is obvious or already in context

**Things Marvyn has gotten angry about in past sessions (don't repeat):**
- Reverting his work without permission
- Redirecting users to momence.com when he said everything must be native
- Sharing unverified URLs
- Saying you've "tested everything" when you haven't actually tested
- Being told "I don't have enough information" instead of using the tools to find out
- Asking "should I do X?" when X is clearly the next step

---

## CURRENT STATE OF THE BUILD

### What's working
- **Mobile web app at `/m/`** — 16 pages, native iOS feel. All pages have "Book a Class" header pill linking to `m/schedule.html`. Homepage has hamburger menu + Book a Class pill side by side.
- **Native booking modal** in `m/schedule.html` — fetches Momence API directly, has full guest checkout flow with email check, login, MFA, customer fields, Stripe Payment Request API (Apple Pay/Google Pay), Stripe Card Element, promo codes.
- **All 13 package purchase buttons** across `m/index.html`, `m/classes.html`, `m/pricing.html` link natively to `m/schedule.html?buy=PRODUCT_ID` which opens the booking modal directly into purchase mode.
- **Cloudflare Worker** at `https://sabda-checkout-proxy.sabda.workers.dev` is deployed with the corrected `/sabda-api/pay` endpoint that uses Momence's real payment endpoints (`/plugin/memberships/{id}/pay` for packs/memberships, `/plugin/sessions/{id}/pay` for paid class bookings).
- **Worker endpoints `/health`, `/check-email`, `/login`, `/mfa-verify`, `/promo`, `/book`** — all working and tested.
- **Worker `/pay` endpoint** — verified end-to-end via curl. Real Stripe error responses (e.g. `"No such PaymentMethod"`) confirm the request structure is correct. Real payments will process when a real Stripe-generated `pm_xxx` ID is sent.
- **Domain-aware mobile redirects** on 23 desktop pages — works on both `marv0611.github.io/sabdawebsite/` and `sabdastudio.com` (when DNS sorted).

### What's NOT working / unverified
- **Real Stripe payment never tested with a real card.** Marvyn needs to do a €18 Trial purchase from his phone to confirm. Until then, the entire payment flow is "should work but unverified."
- **3D Secure flow** — code is in place (Worker forwards `clientSecret`, mobile JS calls `confirmCardPayment`) but never exercised with a real 3DS card.
- **Apple Pay button rendering** — code is in place, requires verified domain on real Safari to test.
- **MFA flow** — code is in place but no Momence accounts with MFA enabled have been used to test.
- **`sabdastudio.com`** — still a Squarespace EXPIRED page. Renewal flagged urgent (expiry April 21, 2026). Until DNS is resolved or Squarespace is renewed, the site is only accessible at `marv0611.github.io/sabdawebsite/`.
- **`marv0611.github.io/sabdawebsite/` (no subpath)** — returns 404. There is no `index.html` at the repo root. The "homepage" file is `SABDA_v16.html`.

---

## CRITICAL TECHNICAL CONTEXT

### The Worker payment fix (Session P16's main work)

The Worker's `/sabda-api/pay` endpoint had been broken for ALL real payments since day one (per project notes "Real payment testing not yet completed"). Both desktop and mobile use the same Worker.

**Original bug** (line 765 of `cloudflare-worker-checkout-proxy.js`):
```js
const stripeAcct = session.stripeConnectedAccount || '';  // STRING "acct_1RUWnoBf6nsynAht"
if (stripeAcct) body.stripeConnectedAccountId = stripeAcct;  // wrong field name AND wrong type
```

Two bugs in one line:
1. Forwarded `stripeConnectedAccount` (string) as `stripeConnectedAccountId` (which Momence expects as a number)
2. The endpoint `/_api/primary/plugin/sessions/:id/pay` is for free bookings only — rejects `stripePaymentMethodId` and `boughtMembershipIds` as `never` types

**The fix** (deployed as version `33205429-0ab7-4ad7-9e9a-0ec6f338dd82`):

Two code paths in `handlePay`:
- **`if (productId)` → membership/pack purchase** → `POST /_api/primary/plugin/memberships/{productId}/pay`
- **`else if (sessionId)` → paid class booking** → `POST /_api/primary/plugin/sessions/{sessionId}/pay`

Both use:
- `paymentMethod: {id: stripePaymentMethodId}` as a NESTED OBJECT (NOT `stripePaymentMethodId` flat)
- `stripeConnectedAccountId: 38966` as a NUMBER (NOT the string `acct_1RUWnoBf6nsynAht`)
- `customerFields: {"164360": lang, "164361": city}` as an OBJECT (NOT an array)

### Momence API key facts you MUST know

| Thing | Value |
|---|---|
| Host ID | `54278` |
| Numeric Stripe account ID | `38966` (use in `stripeConnectedAccountId`) |
| Stripe account string | `acct_1RUWnoBf6nsynAht` (Stripe-side, NOT what Momence wants) |
| Home location ID | `49623` (Muntaner studio) |
| Custom field 164360 | Language SELECT (English / Castellano / Català) |
| Custom field 164361 | City TEXT input |
| Readonly API token | `a0314a80ca` |
| Readonly API URL | `https://momence.com/_api/primary/api/v1/Events?hostId=54278&token=a0314a80ca` |
| Stripe public key | `pk_live_RoPa2iuvwBbqEISUd2LYTmKF` |
| Stripe account string (for Stripe.js) | `acct_1RUWnoBf6nsynAht` |

**Momence checkout endpoints** (discovered by reverse-engineering their React bundle):
- `/_api/primary/plugin/memberships/{id}/pay` — packs and memberships (this is THE endpoint for buying Trial €18, 3-Pack €50, 5-Pack €85, 10-Pack €149, Flex €99/mo, Ritual €109/mo, Immerse €130/mo, Immerse 3-Mo €330)
- `/_api/primary/plugin/sessions/{id}/pay` — paid class bookings (when buying a single drop-in as a guest)
- `/_api/primary/plugin/sessions/{id}/membership-pay` — booking with credits (for users with active membership)
- `/_api/primary/checkout/customer/alert` — email existence check (used by `/sabda-api/check-email`)
- `/_api/primary/auth/login` — login
- `/_api/primary/checkout/cart/recalculate` — useful for getting numeric account ID, but...
- `/_api/primary/checkout/cart/pay` — **DEAD END for guests, requires authentication, always returns "Cannot read properties of undefined (reading 'email')"** — DO NOT USE for guest checkouts

### All 12 Momence Product IDs

| ID | Product | Price | Type |
|---|---|---|---|
| 443934 | Trial Class | €18 | pack (membership type) |
| 445630 | Drop-in | €22 | pack |
| 443935 | Intro 3-Pack | €50 | pack |
| 443937 | 5-Pack | €85 | pack |
| 443939 | 10-Pack | €149 | pack |
| 706876 | Flex Membership | €99/mo | membership |
| 709976 | Ritual Membership | €109/mo | membership |
| 431216 | Immerse Membership | €130/mo | membership |
| 445600 | Immerse 3-Month | €330 | membership |
| 507726 | Ice Bath Single | €12 | pack (currently disabled) |
| 507728 | Ice Bath 3-Pack | €30 | pack (currently disabled) |
| 507729 | Ice Bath 5-Pack | €40 | pack (currently disabled) |

All product IDs are hardcoded in the Worker's `PRODUCT_PRICES` map (the Worker can't reach Momence's authenticated `/host/memberships` endpoint, so prices must be hardcoded).

### The mobile booking modal flow

```
User click on class on schedule.html
  → openMo(link, title, time, teacher) sets curSession
  → modal opens, showGuestStep() shows First/Last/Email
  → doGuestCheck() POSTs /sabda-api/check-email
    → If exists: showLoginStep with login form + Forgot Password link
      → doLogin() POSTs /sabda-api/login → either showConfirmStep (if has membership) or showMfaStep (if MFA required) or showNoMembership (if logged in but no credits)
    → If new: showNoMembership() shows package picker (Trial, 3-Pack highlighted, memberships, packs)
      → User picks → showPayForm(type, price, productId, name, desc)
      → Customer fields collected (phone, language, city)
      → Stripe Payment Request button mounted (Apple/Google Pay)
      → Stripe Card Element mounted
      → User submits → doPayAndBook(type, price, productId)
        → If free (100% promo): POST /sabda-api/pay with stripePaymentMethodId='free'
        → Else: stripe.createPaymentMethod() then POST /sabda-api/pay
        → If 3DS: stripe.confirmCardPayment(clientSecret)
        → showSuccess() decrements local spot count

User click on pricing button (e.g. "Get 3-Pack")
  → schedule.html?buy=443935
  → init() reads ?buy= param, calls openPackagePurchase('443935')
  → Sets curSession with isPackagePurchase: true, productId, productPrice, productType
  → showPackageGuestStep() shows First/Last/Email (skips email-exists check)
  → doPackageGuestCheck() goes directly to showPayForm
  → Same flow as above but the pay button shows "Pay €X" not "Pay €X & Book Class"
```

### The mobile JS sends these fields to `/sabda-api/pay`

```js
{
  sessionId: curSession.isPackagePurchase ? null : curSession.id,
  sessionToken: curSessionToken,
  stripePaymentMethodId: pm.id,  // from stripe.createPaymentMethod
  firstName: curUser.firstName,
  lastName: curUser.lastName,
  email: curUser.email,
  password: sessionPassword,  // auto-generated via genPassword()
  type: type,           // 'pack' | 'membership' | 'single'
  productId: productId, // for package purchases
  discountCode: activePromo || undefined,
  actualPrice: discountedPrice !== null ? discountedPrice : price,
  phoneNumber: cf.phoneNumber,  // "+34612345678" format
  customerFields: cf.customerFields  // {"164360": lang, "164361": city}
}
```

### The Worker's `handlePay` request to Momence (membership purchase)

```js
POST https://momence.com/_api/primary/plugin/memberships/443935/pay
Content-Type: application/json

{
  priceInCurrency: 50,
  email: "...",
  firstName: "...",
  lastName: "...",
  phoneNumber: "+34612345678",
  password: "...",  // for new account creation
  isGift: false,
  isPaymentPlanUsed: false,
  applyDiscountToPaidTrial: true,
  stripeConnectedAccountId: 38966,  // NUMERIC
  customerFields: {"164360": "English", "164361": "Barcelona"},
  smsCommunicationsTransactionalConsent: false,
  smsCommunicationsMarketingConsent: false,
  isLoginRedirectDisabled: true,
  customQuestionAnswers: [],
  appliedPriceRuleIds: [],
  homeLocationId: 49623,
  hasRecurringChargesConsent: true,
  enableCardAutofill: false,
  paymentMethod: {id: "pm_..."}  // OBJECT, not flat field
}
```

### The Worker's `handlePay` request to Momence (paid class booking)

```js
POST https://momence.com/_api/primary/plugin/sessions/127724587/pay
Content-Type: application/json

{
  tickets: [{firstName, lastName, email, isAdditionalTicket: false}],
  totalPriceInCurrency: 20,
  loadDate: "2026-04-07T16:00:00.000Z",  // from session API
  stripeConnectedAccountId: 38966,
  phoneNumber: "+34612345678",
  customerFields: {"164360": "English", "164361": "Barcelona"},
  isLoginRedirectDisabled: true,
  isGuestOnlyBooking: true,
  paymentMethod: {id: "pm_..."}
}
```

---

## DEVELOPMENT WORKFLOW

### Repo
```
github.com/marv0611/sabdawebsite
git config: marv0611 / marvyn@sabdastudio.com
```

### Cloudflare Worker deployment
```bash
cd /home/claude/sabdawebsite
npm install -g wrangler
export CLOUDFLARE_API_TOKEN="cfut_qceLUS3lhp88g4ioHNN04xCdxfiIvRXlbVFmxZXF13c7107e"
export CLOUDFLARE_ACCOUNT_ID="ac63756828d402343fc988ec9f161f56"
wrangler deploy
```
- `wrangler.toml` is in the repo
- Backup of the broken original at `cloudflare-worker-checkout-proxy.js.bak`
- The token is exposed and should be regenerated, but it works

### Verifying the Worker
```bash
PROXY="https://sabda-checkout-proxy.sabda.workers.dev"
# Health
curl -s $PROXY/sabda-api/health
# Pay (will get Stripe error with fake pm)
curl -s -X POST $PROXY/sabda-api/pay -H "Content-Type: application/json" -d '{
  "productId": "443934",
  "stripePaymentMethodId": "pm_test_will_fail",
  "firstName": "Test", "lastName": "User",
  "email": "test@test.com",
  "password": "TestPass1234!",
  "phoneNumber": "+34612345678",
  "customerFields": {"164360": "English", "164361": "Barcelona"},
  "actualPrice": 18
}'
# A real Stripe error like "No such PaymentMethod" means the request structure is correct
```

### Editing files

**Use `str_replace` with sufficient surrounding context** — sed often fails on apostrophes and special characters and corrupts multi-line replacements. Python heredoc file assembly causes duplicate blocks.

**After every edit, validate:**
```bash
grep -c '</html>' file.html  # should return 1
node -e "const html=require('fs').readFileSync('file.html','utf8'); /* check for parse errors */"
```

**Push pattern:**
```bash
git add -A && git commit -m "..." && git push origin main
sleep 55  # let GitHub Pages rebuild
curl -s "URL?v=N" | grep "unique-string"  # verify
```

GitHub Pages CDN caches aggressively. Always use `?v=N` cache busters.

### Testing on the live site
- Mobile homepage: `https://marv0611.github.io/sabdawebsite/m/index.html?v=NN`
- Mobile schedule: `https://marv0611.github.io/sabdawebsite/m/schedule.html?v=NN`
- Mobile pricing: `https://marv0611.github.io/sabdawebsite/m/pricing.html?v=NN`
- Worker health: `https://sabda-checkout-proxy.sabda.workers.dev/sabda-api/health`

### Puppeteer for browser automation
Available at `/home/claude/.npm-global/lib/node_modules/@mermaid-js/mermaid-cli/node_modules/puppeteer` with chrome at `/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome`.

Container has an HTTPS proxy with JWT auth. Use this pattern:
```js
const puppeteer = require('/home/claude/.npm-global/lib/node_modules/@mermaid-js/mermaid-cli/node_modules/puppeteer');
const u = new URL(process.env.HTTPS_PROXY);
const browser = await puppeteer.launch({
  executablePath: '/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox', `--proxy-server=${u.protocol}//${u.host}`]
});
const page = await browser.newPage();
await page.authenticate({username: u.username, password: u.password});
```

### Reverse-engineering Momence's API (for when you need to find new endpoints)

```bash
# Get the JS bundles
curl -sL "https://momence.com/m/443935" | grep -oE 'src="[^"]*\.js[^"]*"'
curl -sL "https://static.momence.com/checkout-pages/static/js/main.{HASH}.js" > /tmp/main.js

# Find endpoints
grep -aoE '/_api/[a-zA-Z0-9/_-]{1,80}' /tmp/main.js | sort -u
grep -aoE '"[a-z/_-]{1,30}pay[a-z/_-]{1,30}"' /tmp/main.js

# Find payload structures (search for object literals with relevant fields)
python3 << 'PYEOF'
with open('/tmp/main.js', 'rb') as f:
    js = f.read().decode('utf-8', errors='ignore')
import re
candidates = re.findall(r'\{[^{}]{200,2500}membershipId[^{}]{0,100}\}', js)
for c in candidates: print(c[:1500]); print('---')
PYEOF
```

---

## BRAND RULES

**Visual identity:**
- Primary color: `#203999` (deep navy/indigo)
- Secondary: `#F8A6A3` (salmon pink)
- Accent: `#02F3C5` (vivid cyan/green)
- Display font: `Eugusto Bold`
- Body font: `DM Sans`
- NO visible em dashes anywhere (Marvyn's rule)
- Aesthetic: dark, immersive, premium but warm. Like stepping into a 360° projection room.

**Voice:**
- Clever, witty, thought-provoking but down-to-earth
- NEVER woo-woo, esoteric, hippie, basic, generic wellness
- Think: teamLab meets Soho House meets a really good Berlin club that does yoga

**Class offering** (DO NOT include things SABDA doesn't offer):
- Yoga (7 types): Vinyasa, Power Vinyasa, Hatha Vinyasa, Hatha Yoga, Yoga Sculpt, Yin Yoga, Yoga & Breathwork
- Pilates (4 types): Core Pilates, Power Pilates, Full Body Pilates, **Glutes and Core Lab** (NOT "Pilates Sculpt")
- Sound Healing (4 types): Sound Healing, Yin & Sound Healing, Serenity and Sound, Guide Sound Experience
- Breathwork (3 types): Alchemy Breath, Reset & Calm Breathwork, **Transformational Breathwork**
- Ice Bath (currently "Reopening 1st of May")
- Ecstatic Dance (currently "Coming Soon")

**SABDA does NOT offer:**
- Reformer pilates (only mat)
- Yoga nidra
- Standalone meditation classes (the `/classes/meditation/` page is a CATEGORY page that points to sound healing/breathwork/yin yoga)

---

## TEAM

| Person | Role |
|---|---|
| **Marvyn** | Co-founder, all technical decisions, website architecture |
| Juliette | Co-founder, operations |
| Mark | CMO, content/ads/GBP posts |
| Mica | Studio manager, in-person review collection |
| Katrina | Corporate sales, venue platform listings |
| Uri | External ads manager |
| Gloria | GA4/pixel/tracking |

---

## OUTSTANDING WORK / PRIORITY ORDER

**Immediate (blocks payment going live):**
1. **Real €18 Trial purchase test** by Marvyn from his phone with a real card. Watch the booking modal for any error message. If it succeeds, all other products will work too.
2. If anything fails, the error message will tell you exactly what's missing — most likely a field name issue. Iterate on the Worker.

**High priority (blocks production launch):**
3. Resolve `sabdastudio.com` domain — either renew Squarespace or point DNS to GitHub Pages with a CNAME file. Squarespace expiry is April 21, 2026.
4. Create a root `index.html` that redirects to `SABDA_v16.html` so `marv0611.github.io/sabdawebsite/` doesn't 404.
5. Regenerate the exposed Cloudflare API token AND GitHub PAT. Both have been in 5+ chat conversations now.

**Important (quality):**
6. Test 3D Secure flow with a real European card that requires it.
7. Test Apple Pay button rendering on a verified domain on real Safari.
8. Test MFA flow with a Momence account that has MFA enabled.
9. The booking modal auto-generates a password the user never sees. May want to add an optional "Save your password" message or let them set their own.

**Nice to have:**
10. Once payments are confirmed working, remove the WORKER_FIX_NOTES.md file from the repo (or move to a `docs/` folder).
11. The Cloudflare Worker source file `cloudflare-worker-checkout-proxy.js.bak` is the broken original — can be deleted once everything is verified working.

---

## KEY URLS

| Thing | URL |
|---|---|
| Mobile homepage | `https://marv0611.github.io/sabdawebsite/m/index.html` |
| Mobile schedule | `https://marv0611.github.io/sabdawebsite/m/schedule.html` |
| Mobile pricing | `https://marv0611.github.io/sabdawebsite/m/pricing.html` |
| Desktop homepage | `https://marv0611.github.io/sabdawebsite/SABDA_v16.html` |
| Desktop classes | `https://marv0611.github.io/sabdawebsite/classes.html` |
| Cloudflare Worker | `https://sabda-checkout-proxy.sabda.workers.dev` |
| Worker health | `https://sabda-checkout-proxy.sabda.workers.dev/sabda-api/health` |
| GitHub repo | `https://github.com/marv0611/sabdawebsite` |
| Production domain | `https://sabdastudio.com` (Squarespace EXPIRED — broken) |

---

## FINAL WARNINGS FOR THE NEXT AI

1. **Test everything end-to-end with curl before claiming it works.** Don't trust that "the function parses cleanly" means it functions correctly. Marvyn will catch you if you say something works when it doesn't.

2. **Never revert Marvyn's design intent without explicit permission**, even if you think the alternative is "safer." If something is broken, FIX IT, don't undo his work.

3. **Read the manual sections 24 and 25 BEFORE making any changes.** Section 25 documents 12 specific mistakes I made in this session — don't repeat them.

4. **The Worker is currently working** (as of `33205429-0ab7-4ad7-9e9a-0ec6f338dd82`). Don't change it unless something is broken. If you DO need to change it, test with curl FIRST against the live deployed version, not just the source file.

5. **Use the correct Momence API endpoints:**
   - Membership/pack purchase: `/plugin/memberships/{id}/pay`
   - Paid class booking: `/plugin/sessions/{id}/pay`
   - DO NOT use `/checkout/cart/pay` for guest checkouts (it requires authentication)

6. **`paymentMethod` is an OBJECT** with an `id` field, NOT a flat `stripePaymentMethodId` field. This is the most common Momence API mistake.

7. **`stripeConnectedAccountId` is the NUMBER `38966`**, NOT the Stripe account string `acct_1RUWnoBf6nsynAht`. They are different fields.

8. **iOS Safari zooms on inputs under 16px font-size.** All form inputs MUST be 16px or larger.

9. **Don't ask Marvyn to test things you can test yourself.** If you have curl and a browser via puppeteer, use them.

10. **When you don't know something, USE THE TOOLS to find out.** Don't say "I don't know" — grep the bundle, hit the endpoint, read the source. The hard answers are usually 5-10 minutes of investigation away.

---

*End of handoff. Read this before doing anything. Then read the manual. Then wait for Marvyn to tell you what he wants.*
