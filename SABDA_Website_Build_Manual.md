# SABDA Website Build — Project Manual
## For AI Chat Handoff & Developer Reference
### Last Updated: March 14, 2026 — Session 4 Final

---

## QUICK START FOR NEXT CHAT

Paste this at the beginning of your next chat:

> I'm continuing the SABDA website build. Read the project manual first — it's at `SABDA_Website_Build_Manual.md` in the GitHub repo (https://github.com/marv0611/sabdawebsite). The current homepage is `SABDA_v16.html`, the classes page is `classes.html`. Use this GitHub PAT for pushing: `YOUR_GITHUB_PAT_HERE`. Clone the repo, read the manual thoroughly before making any changes. After every push, give me the GitHub Pages link so I can check in my browser.

**CRITICAL — PREVIEW LINK FORMAT:**
The site is hosted via **GitHub Pages**. After every push, provide these links:
```
Homepage:  https://marv0611.github.io/sabdawebsite/SABDA_v16.html
Classes:   https://marv0611.github.io/sabdawebsite/classes.html
Corporate: https://marv0611.github.io/sabdawebsite/rent-corporate.html
```

**⚠️ DO NOT USE htmlpreview.github.io** — it blocks third-party JavaScript (Momence widget, analytics, etc.). GitHub Pages is the only preview method that works for pages with external scripts. See Lesson 6.14 below.

GitHub Pages takes 30–60 seconds to rebuild after a push. Always verify the deployed version by checking the `<!-- version comment -->` in the HTML `<head>` with curl before sending the link to Marvyn.

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Brand & Design System](#2-brand--design-system)
3. [Tech Stack & Workflow](#3-tech-stack--workflow)
4. [Current Build Status (v16)](#4-current-build-status-v16)
5. [Page Architecture & Flow](#5-page-architecture--flow)
6. [Critical Lessons — DO NOT REPEAT](#6-critical-lessons--do-not-repeat)
7. [Conversion Strategy](#7-conversion-strategy)
8. [Asset Inventory](#8-asset-inventory)
9. [Pending Work](#9-pending-work)
10. [Integration Requirements](#10-integration-requirements)
11. [Key URLs & Credentials](#11-key-urls--credentials)
12. [File Index](#12-file-index)
13. [Session 3 — Classes Page & Momence Widget](#13-session-3--classes-page--momence-widget)
14. [Session 3 — Mistakes & Lessons Learned](#14-session-3--mistakes--lessons-learned)
15. [Current Nav Structure](#15-current-nav-structure-global--applies-to-all-pages)
16. [Current File Versions](#16-current-file-versions)

---

## 1. PROJECT OVERVIEW

**SABDA** is an immersive audio-visual wellness studio in Barcelona. Classes (yoga, pilates, sound healing, breathwork, ecstatic dance, meditation, ice bath) run inside a 360° projection room with Dolby Atmos spatial audio.

**Why we're building this website:**
- Current site (sabda.es) is not conversion-optimized
- Most ad traffic converts to €17 trial instead of €48 3-pack
- No dedicated landing pages, no mobile-first design, no local SEO
- Business is preparing for a potential sale — strong web presence impacts valuation

**Key people:**
- **Marvyn Halfon** (co-founder) — leads this build, approves all design decisions. He is the person you're talking to in chat.
- **Juliet Levine** (co-founder) — operations, artistic core
- **Mark Aspinall** (CMO) — ads, content, Momence
- **Uri Digón** — external Meta Ads manager
- **Gloria** — pixel/tracking implementation
- **Katrina Affleck** — sales, receives corporate inquiries at connect@sabdastudio.com

**Primary conversion goal:** Get visitors to book the **€48 intro 3-pack** (not the €17 single trial).

---

## 2. BRAND & DESIGN SYSTEM

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Brand Navy (background) | `#0e1235` | Primary background, all sections |
| Brand Navy (logo) | `#203999` | Logo color from Brand Foundations PDF |
| Salmon | `#F8A6A3` | Accent, italic text, 4.8 scores, Eixample, footer "Connect" heading, "Wellness" pillar |
| Cyan | `#02F3C5` | CTAs, labels, 360° and 42 numbers, footer "Explore" heading, "Art" pillar |
| Blended Mid-tone | `#7fcdb5` | Some particle elements |
| Warm White | `#f0efe9` | Body text, headings |
| Muted White 60% | `rgba(240,239,233,.6)` | Body copy |
| Muted White 38% | `rgba(240,239,233,.38)` | Secondary text, descriptions |

### Typography
| Role | Font | Weight | Notes |
|------|------|--------|-------|
| Headings | PT Serif | 400, 700, italic | Google Fonts. Also used for partner brand names in marquee |
| Body | DM Sans | 300, 400, 500, 600 | Clean modern sans-serif |
| Logo | Eugusto Bold | — | Use the white logo PNG, never render as text |

### Design Principles
- **Dark, immersive feel** — like stepping from a noisy Barcelona street into the 360° projection room
- **NO section boundaries** — single continuous `#0e1235` background with fine 1px lines (`rgba(240,239,233,.06)`) between sections
- **Global particle field** — the entire page lives inside a floating particle nebula (cyan + salmon + brand blue particles, mouse-repulsive)
- **NOT:** woo-woo, esoteric, hippie, basic yoga studio aesthetic, generic template look
- **Think:** teamLab meets Soho House meets a really good Berlin club that also does yoga
- **Brand pillars:** Art (cyan) · Tech (white) · Wellness (salmon)

---

## 3. TECH STACK & WORKFLOW

### Decision: Single HTML file → paste into Framer for hosting

**Final stack:** One self-contained HTML file with all CSS and JS inline. No frameworks, no build tools, no dependencies except Google Fonts. When approved, paste into Framer as a code component.

### GitHub Workflow
```
Repository: https://github.com/marv0611/sabdawebsite
Branch: main
Token: YOUR_GITHUB_PAT_HERE

# Clone and configure:
git clone https://github.com/marv0611/sabdawebsite.git
cd sabdawebsite
git remote set-url origin https://x-access-token:YOUR_GITHUB_PAT_HERE@github.com/marv0611/sabdawebsite.git
git config user.name "Claude" && git config user.email "claude@anthropic.com"

# After each edit:
cp SABDA_v16.html /mnt/user-data/outputs/SABDA_v16.html
git add SABDA_v16.html && git commit -m "description" && git push origin main

# ALWAYS present_files after edits so Marvyn can preview locally
# ALWAYS provide the htmlpreview link in chat:
# https://htmlpreview.github.io/?https://raw.githubusercontent.com/marv0611/sabdawebsite/main/SABDA_v16.html
```

**IMPORTANT — GitHub push protection:** The PAT token cannot be committed to the repo. GitHub will reject the push. Use `YOUR_GITHUB_PAT_HERE` as placeholder in this file. Marvyn provides the real token in the chat message.

### Video Files — LFS
Video files in the repo use Git LFS. The `raw.githubusercontent.com` URL returns a LFS pointer, NOT the video.
```
WRONG: https://raw.githubusercontent.com/marv0611/sabdawebsite/main/0312.mp4
RIGHT: https://media.githubusercontent.com/media/marv0611/sabdawebsite/main/0312.mp4
```

### Image Files — Direct
```
https://raw.githubusercontent.com/marv0611/sabdawebsite/main/SABDA%20white%20logo.png
```

### Preview Links
```
DO NOT USE: htmlpreview.github.io (blocks 3rd party scripts — Momence widget won't load)
DO NOT USE: raw.githubusercontent.com (downloads file)
DO NOT USE: github.com/blob/ (repo view)

USE: GitHub Pages (real web server, external scripts work):
  Homepage:  https://marv0611.github.io/sabdawebsite/SABDA_v16.html
  Classes:   https://marv0611.github.io/sabdawebsite/classes.html
  Corporate: https://marv0611.github.io/sabdawebsite/rent-corporate.html

GitHub Pages setup: Already enabled on main branch, root path "/".
Rebuild time: 30–60 seconds after push.
Verify deployment: curl -s https://marv0611.github.io/sabdawebsite/classes.html | head -4 | tail -1
```

---

## 4. CURRENT BUILD STATUS (v16)

### File: `SABDA_v16.html`

Active homepage. ~1000 lines. Fully self-contained.

### What's in v16 — confirmed working:

**Loader (2.5 seconds)**
- 9 concentric rings that spiral in one by one (staggered 80ms, each from scale 0.5 + rotated -90° to full size)
- Gentle floating animation on whole symbol (±3° rotation + scale breathing)
- "Enter the Void" text fades in with letter-spacing reveal at 0.9s
- Uses `DOMContentLoaded` (NOT `window.load`) — critical: `window.load` waits for the 49MB video and the loader gets stuck
- Dismisses at 2.5s, fade-out transition 1.4s

**Custom Cursor**
- SABDA pink symbol PNG as cursor (28px)
- Salmon-tinted ring follower with spring physics
- Scales up on hover over interactive elements (a, button, etc.)

**Global Particle Field**
- Fixed canvas behind entire page (z-index:1)
- ~960 particles in 3 brand colors: ~38% cyan `[2,243,197]`, ~34% salmon `[248,166,163]`, ~28% brand blue `[32,57,153]`
- Mouse repulsion physics (120px radius)
- All content sits above at z-index:2

**Nav**
- Semi-transparent: `rgba(14,18,53,.45)` + `backdrop-filter:blur(14px)`
- Darkens on scroll: `rgba(14,18,53,.88)`
- Logo left, links center, "Book a Class" CTA right (cyan → momence.com/m/443935)

**Hero**
- Full-viewport video background (`0312.mp4` via LFS media URL)
- Video: `playbackRate=0.55`, CSS filter: `contrast(1.12) saturate(1.15) brightness(1.03)`
- Top label: "Art · Tech · Wellness" — 1.4rem, Art in cyan, Wellness in salmon
- H1: "The Future of Wellness"
- Single CTA: "3 Classes for €48" (cyan button)
- Note: "€16/class · New students · No commitment"

**Trust Row (ANIMATED)**
- Stars pop in one by one (staggered 70ms, spin from -45° to 0°)
- 4.8 counts up from 0 with ease-out sextic curve (2.2s, dramatic slowdown at end) — scores in SALMON
- Labels fade up after numbers settle
- Divider line grows from 0 to 52px height
- Second group (Google 350+ reviews) starts 250ms after first (ClassPass 15,000+ reviews)
- Animation waits until 2.7s after page load (after loader dismisses) then checks if section is in viewport

**Stats Strip (ANIMATED)**
- 4 items staggered 180ms each, fade up from 24px below
- 360° (cyan, counts from 0) · Dolby Atmos (text) · 42 (cyan, counts from 0) · Eixample (salmon, text)
- Colored numbers get subtle text-shadow glow when animated
- Divider lines grow from 0 height
- Fires 700ms after trust animation starts
- Same viewport-check logic as trust

**Partners Marquee**
- "Trusted by leading brands" label
- 8 brands: Honest Greens · Aire · Danone · FC Barcelona · Condé Nast Traveler · El Periódico · Time Out · CNN
- PT Serif 1.3rem (not sans-serif caps — these are prestigious names)
- Em-dash separators at 12% opacity
- 55s cycle (slow, dignified pace — people can read every name)
- Edge fade masks (180px gradient on left and right)
- Data tripled for seamless infinite loop (scrolls -33.333%)
- Colors forced by render index (`i%2`): green, pink, green, pink...

**Classes — Dual-Row Auto-Scrolling Gallery**
- Two rows of images, scrolling in opposite directions (like the Asana Framer template)
- All images uniform size: 460×320px, 12px border radius
- Row 1 (scrolls left, 50s): Vinyasa Yoga, Sound Healing, Breathwork (× 2 for loop)
- Row 2 (scrolls right, 50s): Pilates, Ecstatic Dance, Meditation Journeys (× 2 for loop)
- Pure CSS animation, always running (no hover pause, no click interaction)
- Navy gradient fade (120px `::after`) at bottom to blend into next section
- Class name + duration tag overlaid at bottom of each image

**Space Gallery**
- Full-bleed 5-slide carousel with prev/next arrows and dots
- Photographer-style captions
- Each slide: `object-fit:cover`, full viewport

**Testimonials**
- "What people say" label only (heading "They came once / keep coming back" was REMOVED — Marvyn didn't want it)
- 4 rotating quotes, auto-advance 6s, dot navigation
- Border-top AND border-bottom fine lines

**Pricing Section — 3 Cards**
- Left: Intro 3-Pack €48 (outline button "Get Started")
- Middle (highlighted): Unlimited Monthly €130/mo ("Popular" badge, cyan button "Join Now")
- Right: 3-Month Unlimited €300 (outline button "Start Unlimited")
- Each card has feature list with cyan dot bullets
- Cards use flexbox column with flex:1 on description for equal heights
- Footer: "See all our offers →" (cyan link to Momence)

**Location**
- Address, directions, Google Maps embed

**Footer**
- 4-column: Brand info, Explore (cyan heading), Connect (salmon heading), Contact (white heading)
- "Art · Tech · Wellness" pillars: Art in cyan, Wellness in salmon
- Fine lines (1px `rgba(240,239,233,.06)`) between ALL sections throughout the page

**Mobile Sticky Bar**
- Shows after scrolling past hero

---

## 5. PAGE ARCHITECTURE & FLOW

```
HERO (video + "The Future of Wellness" + single CTA)
  ↓ fine line
TRUST (animated 4.8 stars + counters)
  ↓ fine line
STATS (animated 360° / Dolby / 42 / Eixample)
  ↓ fine line
PARTNERS (slow marquee — Honest Greens, Aire, Danone, FC Barcelona, CNN...)
  ↓ fine line
CLASSES (dual-row auto-scrolling image gallery)
  ↓ navy gradient fade (no line — smooth blend)
SPACE GALLERY (full-bleed carousel)
  ↓ fine line
TESTIMONIALS (rotating quotes)
  ↓ fine line
PRICING (3 cards: €48 / €130/mo / €300/3mo)
  ↓ fine line
LOCATION (map + directions)
  ↓ fine line
FOOTER
```

---

## 6. CRITICAL LESSONS — DO NOT REPEAT

### 6.1 ONLY Change What Is Asked

**THE MOST IMPORTANT RULE.** If Marvyn says "update the number of classes to 42," update ONLY that number. Do not rearrange sections, move content between sections, add or remove elements, or "improve" things that weren't mentioned. This mistake was made twice and had to be reverted both times.

### 6.2 Always Provide the HTMLPreview Link

After every push, always give Marvyn this link:
```
https://htmlpreview.github.io/?https://raw.githubusercontent.com/marv0611/sabdawebsite/main/SABDA_v16.html
```
Never give raw GitHub links (they download). Never give repo links. Never give Google links that require downloading. He reviews in Chrome, not in Claude's preview.

### 6.3 Loader Must Use DOMContentLoaded, NOT window.load

The hero video is 49MB via Git LFS. `window.addEventListener('load',...)` waits for the full video download. On slow connections or through htmlpreview.github.io, this means the loader gets stuck on "Enter the Void" forever. Always use `document.addEventListener('DOMContentLoaded',...)`.

### 6.4 Animations That Fire Behind the Loader

If you have scroll-triggered animations (IntersectionObserver) on sections that are already in the viewport on page load, they will fire immediately — BEHIND the loader overlay. The user never sees them. Solution: delay all animation observers until AFTER the loader dismisses. Current code waits 2700ms (2500ms loader + 200ms buffer), then checks if sections are already in viewport. If yes, fires directly. If not, attaches IntersectionObserver as fallback.

### 6.5 CSS Video Sharpening Limits

`filter: contrast(1.12) saturate(1.15) brightness(1.03)` and `playbackRate=0.55` is the maximum client-side enhancement. True sharpening requires re-encoding the source video.

### 6.6 Git LFS Videos

`raw.githubusercontent.com` returns LFS pointers, not video data. Always use:
`https://media.githubusercontent.com/media/marv0611/sabdawebsite/main/FILENAME.mp4`

### 6.7 3D Three.js Symbol (REMOVED — Don't Rebuild)

We spent hours on this. It was ultimately killed because it didn't serve conversion. If ever revisited: flat circles rotating on their center axis are invisible — you must tilt first, then rotate perpendicular.

### 6.8 Particle Systems

- Global fixed canvas > per-section canvases. One canvas with 960 particles outperforms four canvases with 3000 each.
- Use 3 brand colors (cyan 38%, salmon 34%, blue 28%) not just two.
- `pointer-events:none` on the canvas is mandatory.

### 6.9 Marquee / Auto-Scroll Patterns

- For infinite seamless loops, data must be duplicated (or tripled) and `translateX(-50%)` (or `-33.333%`) used in the keyframe.
- Color alternation must be forced by RENDER INDEX (`i%2`), not by data. With odd item counts, data-based colors break at the loop seam.
- Partner brands are prestigious names — use PT Serif (heading font), not small-caps sans-serif. Slow speed (55s). Edge fade masks. Em-dash separators.
- Gallery auto-scroll must run automatically without requiring mouse hover. Use pure CSS `animation` not JS-triggered.

### 6.10 Equal Height Cards

When using a grid of cards that should be equal height: `display:flex; flex-direction:column` on each card, `flex:1` on the description paragraph, and `align-items:stretch` on the grid. This pushes buttons and feature lists to the same vertical position.

### 6.11 Fine Lines Between Sections

The site uses `1px solid rgba(240,239,233,.06)` as subtle separators between most sections. These are applied as `border-top` or `border-bottom` on the sections themselves. Exception: the transition from classes gallery to space gallery uses a navy gradient fade (`::after` pseudo-element, 120px tall) instead of a line.

### 6.12 Counter Animation Easing

Numbers that count up (4.8, 360, 42) use `ease-out sextic` (`1 - Math.pow(1-t, 6)`) over 2.2 seconds. This creates a "spinning wheel" effect — fast start, dramatic deceleration at the end. Previous version used ease-out quart (power 4) over 1.4s which was too smooth/boring.

### 6.13 Working Style with Marvyn

- He gives precise, specific feedback. Execute exactly what's asked — nothing more, nothing less.
- He reviews in Chrome via htmlpreview.github.io, not in Claude's preview.
- He sends screenshots of issues — read them carefully before coding.
- He thinks strategically — he'll question whether a section should exist at all.
- When he says "improve it," he means a meaningful quality jump, not a small tweak.
- He cares about brand cohesion — colors should always alternate green/pink consistently.
- He values readability and pacing — the partners marquee was slowed down specifically because "these are major brands and people can't process them at speed."

---

## 7. CONVERSION STRATEGY

### Psychology Foundation (Jongmans et al. 2022)
Visual Design → Perceived Usability → Pleasure → Purchase Intention

### Pricing (shown on homepage)
| Offer | Price | Momence URL | Position |
|-------|-------|-------------|----------|
| **Intro 3-Pack** | €48 (€16/class) | momence.com/m/443935 | Left card |
| **Unlimited Monthly** (Popular) | €130/mo | momence.com/m/431216 | Center card (highlighted) |
| **3-Month Unlimited** | €300 (€100/mo) | momence.com/m/445600 | Right card |
| Single Drop-In | €16 | momence.com/m/443934 | Footer text link |

### Full Pricing (not all shown on homepage)
| Offer | Price | Momence URL |
|-------|-------|-------------|
| BCN Resident Week | €50 | momence.com/m/443641 |
| 5-Pack | €80 | momence.com/m/443937 |
| 10-Pack | €140 | momence.com/m/443939 |
| Listening Session | €16 | momence.com/m/556050 |
| Gift Card | Variable | momence.com/gcc/54278 |

---

## 8. ASSET INVENTORY

### Images (load from raw GitHub)
| File | Content | Used In |
|------|---------|---------|
| `SABDA%20white%20logo.png` | White SABDA wordmark | Nav |
| `SABDA%20symbol%20pink.png` | Pink cymatic symbol | Custom cursor |
| `Sabda_20240118_016.jpg` | Yoga class in immersive room | Gallery row 1 |
| `Sabda_20240118_010.jpg` | Sound healing / dark room | Gallery row 1 |
| `Sabda_20240118_009.jpg` | Breathwork / aurora scene | Gallery row 1 |
| `Sabda_20240118_005.jpg` | Pilates / underwater scene | Gallery row 2 |
| `Copy%20of%201.jpg` | Ecstatic Dance / dancer | Gallery row 2 |
| `IMG-26.jpg` | Meditation / aurora room | Gallery row 2 |
| `IMG-27.jpg`, `IMG-5%20(1).jpg`, `IMG-7%20(1).jpg`, `KR233837.jpg`, `cover%20insta.jpg` | Space photos | Space gallery slides |

### Videos (load from LFS media URL)
| File | Content | Used In |
|------|---------|---------|
| `0312.mp4` | Hero video (49MB) | Hero section |

### Fonts
Custom Eugusto Bold .woff files exist but don't load reliably from GitHub. Use Google Fonts PT Serif + DM Sans.

---

## 9. PENDING WORK

### Immediate Priority
- [ ] **classes.html day selector still invisible** — Momence uses styled-components with inline styles that override even `!important` CSS. Current approach (v10) uses JS `element.style.setProperty()` on every element via MutationObserver. This mostly works but the day selector (SUN–SAT row) still renders as dark-on-dark because the widget re-renders via React and overwrites inline styles. MAY NEED: inspecting the live DOM in Chrome DevTools to find the exact styled-component class hashes, then targeting those specifically. Or: accept the native Momence colors for the controls and only dark-theme the cards and page frame.
- [ ] **Mobile responsive pass** on SABDA_v16.html (most traffic from Instagram ads on phones)
- [ ] **Replace hero image** on classes.html — currently using breathwork.jpg as placeholder. Marvyn will provide a rectangular hero image.
- [ ] **Gift card URLs** — currently all point to generic `momence.com/SABDA-54278`. Need actual gift card checkout URLs from Momence. Known URL pattern: `momence.com/gcc/54278`
- [ ] **Pricing URLs** — some packs (5-pack, 10-pack, Residents Week, single drop-in €20) use generic Momence URL. Need direct checkout links.

### Member Portal (Option 3 — approved by Marvyn)
- [ ] **Get Momence OAuth2 API credentials** (client_id + client_secret) from Momence dashboard: Settings → API Clients
- [ ] **Build backend proxy** (Cloudflare Worker or Vercel function) for secure token exchange
- [ ] **Build branded "My Account" page** — login, view bookings, cancel bookings, see membership status
- [ ] Uses Momence Member API: `DELETE /api/v2/member/sessions/{sessionBookingId}` for cancellations
- [ ] Key UX: cancellation interception ("Can't make it? Here are 3 other classes this week")
- [ ] Key UX: pack depletion prompts ("1 class left — upgrade to Unlimited?")

### Additional Pages to Build
- [ ] `/welcome/` — ads landing page (exists as `welcome.html` — needs sync with v16 design)
- [ ] `/pricing/` — full dedicated pricing page (basic version now at bottom of classes.html)
- [ ] `/the-space/` — technology showcase, gallery, specs
- [ ] `/rent-corporate/` — B2B page with inquiry form (placeholder exists with space gallery)
- [ ] `/listening-sessions/` — paused, signup for notifications
- [ ] `/about/` — origin story, mission, values, team
- [ ] `/contact/` — address, map, form

### Technical Integration
- [ ] Meta Pixel (ID: `567636669734630`)
- [ ] EN/ES language toggle
- [ ] GA4 + GTM configuration
- [ ] Real testimonials (current ones are placeholders)

---

## 10. INTEGRATION REQUIREMENTS

### Momence
- **Host ID:** 54278
- **API Token:** a0314a80ca
- **Readonly API Base:** `https://readonly-api.momence.com` (NOT `https://api.momence.com`)
- **Write API Base:** `https://api.momence.com`

**Schedule Widget (current embed method):**
```html
<div id="momence-plugin-host-schedule"></div>
<script src="https://momence.com/plugin/host-schedule/host-schedule.js"
  host_id="54278"
  locale="en"
  i18n='{"TEACHER_SELECT_PLACEHOLDER":"Teachers","TEACHER":"Teacher","SUBSTITUTES_FOR_SHORT":"Sub for"}'>
</script>
```

**Readonly API Endpoints (discovered from widget source):**
```
GET /host-plugins/host/{hostId}/host-schedule/sessions?fromDate=&toDate=&pageSize=&page=&dayOfWeek=
GET /host-plugins/host/{hostId}/host-schedule/dates
GET /host-plugins/host/{hostId}/host-schedule (returns filters: locations, teachers, tags, sessionTypes)
```

**Member API (for customer portal — requires OAuth2):**
```
DELETE /api/v2/member/sessions/{sessionBookingId}   — Cancel booking
GET    /api/v2/member/sessions                      — List customer bookings
```

**Session data structure (from widget code):**
`startsAt, endsAt, sessionName, teacher, teacherPicture, type, inPerson, location, link, durationMinutes, price, currency, isCancelled, capacity, ticketsSold, allowWaitlist, image, level (description), semester, course`

### Meta Pixel
- **Pixel ID:** 567636669734630
- **Events needed:** PageView, ViewContent, InitiateCheckout, AddToCart, Purchase (CAPI), Lead

---

## 11. KEY URLS & CREDENTIALS

| Item | Value |
|------|-------|
| GitHub repo | https://github.com/marv0611/sabdawebsite |
| GitHub PAT | `YOUR_GITHUB_PAT_HERE` |
| **GitHub Pages (PRIMARY)** | **https://marv0611.github.io/sabdawebsite/** |
| Homepage preview | https://marv0611.github.io/sabdawebsite/SABDA_v16.html |
| Classes preview | https://marv0611.github.io/sabdawebsite/classes.html |
| Corporate preview | https://marv0611.github.io/sabdawebsite/rent-corporate.html |
| Current website | https://sabda.es |
| New domain | sabdastudio.com (migration pending) |
| Framer project | https://individual-perspective-340178.framer.app/ |
| Momence host | https://momence.com/SABDA-54278 |
| Instagram | @sabda_studio |
| Address | C/Muntaner 83B, Local 2, 08011 Barcelona |
| Phone | +34 625 44 98 78 |
| General email | info@sabdastudio.com |
| Marketing email | marketing@sabdastudio.com |
| Sales email | connect@sabdastudio.com |

### Company Details
- **Legal name:** SABDA STUDIO S.L.
- **C.I.F:** B44704401

---

## 12. FILE INDEX

| File | Description |
|------|-------------|
| `SABDA_v16.html` | **Current working homepage** (v16.o) |
| `classes.html` | **Classes & schedule page** (v10) — Momence widget, pricing, gift cards |
| `rent-corporate.html` | Corporate/events page — placeholder with space gallery |
| `welcome.html` | Ads landing page — needs sync with v16 |
| `SABDA_Website_Build_Manual.md` | This document |
| `SABDA_Brand_Foundations.pdf` | Brand strategy deck |
| `SABDA_Website_Copy_v1.md` | Page-by-page website copy |
| `Meta_Ads_Chat_Summary_March_2026.md` | Meta Ads analysis |

### Version History
| Version | Key Change | Status |
|---------|------------|--------|
| v12 | Images from GitHub, brand navy, photo cards | Superseded |
| v13 | Animated symbol, card animations | Superseded |
| v15 | Full rebuild with particles, gallery, booking | Superseded |
| v16 | Streamlined flow, global particles, animated counters, dual-row gallery, 3-card pricing, premium partners marquee | **Current (v16.q)** |
| classes-v1 | Initial Momence widget embed with CSS overrides | Superseded |
| classes-v16 | Dark theme via JS, day selector fixed, dropdown z-index, pricing/gift cards, scroll-to-hash | **Current** |

---

## 13. SESSION 3 — CLASSES PAGE & MOMENCE WIDGET

### What Was Built
`classes.html` — a branded schedule page embedding the live Momence widget, with a pricing section and gift card section below it.

### Page Structure (classes.html v10)
```
NAV (same as homepage, "Classes" active)
↓
HERO BANNER (rectangular image with gradient overlay, "Our Schedule" heading)
↓
MOMENCE WIDGET (live schedule — day selector, class cards, book buttons)
↓
PRICING GRID (4 columns: Intro Offers | Drop In | Packs | Membership)
↓
GIFT CARDS (€20, €40, €60, €80, €100, Custom)
↓
FOOTER (30% shorter than original — GLOBAL RULE for all pages)
```

### Momence Widget — What's Shown vs Hidden

**SHOWN (dark themed):**
- "Classes" label with underline
- Week/Month toggle
- Day selector: < SUN 8 | MON 9 | TUE 10 | ... | SAT 14 >
- SHOW ALL / TODAY buttons
- Teachers dropdown (renamed from "Practitioners")
- Session cards (class image, title, teacher, time, Book Now button)

**HIDDEN via CSS/JS:**
- Location filter dropdown (single venue — redundant)
- "Location: SABDA" on each card (redundant)
- Price on each card (pricing is in dedicated section below)
- Pagination (1 ... 99)
- System row (timezone/auth)
- "Powered by Momence" footer

### Pricing Grid (matches current website)
| Intro Offers | Drop In | Packs | Membership |
|---|---|---|---|
| 3 Pack €48 | Drop In €20 | 5 Pack €80 | Monthly Unlimited €130 |
| Trial Drop In €16 | | 10 Pack €140 | 3 Month Unlimited |
| Residents: 1 Week €50 | | | |

### Global Footer Rule
**All footers must be 30% shorter than original.** Applied to SABDA_v16.html and classes.html:
- Desktop: `padding: 52px 80px 30px` (was `80px 80px 44px`)
- Grid gap: `40px` (was `52px`), margin-bottom: `44px` (was `72px`)
- Mobile: `padding: 36px 24px 22px` (was `48px 24px 32px`)

---

## 14. SESSION 3 — MISTAKES & LESSONS LEARNED

### ⚠️ 14.1 — htmlpreview.github.io BLOCKS THIRD-PARTY SCRIPTS

**The mistake:** Used htmlpreview.github.io for previewing classes.html. The Momence schedule widget was completely invisible — just blank space between the hero and pricing. Spent multiple iterations trying to fix CSS when the real problem was the preview tool.

**What happened:** htmlpreview.github.io is a client-side HTML renderer that strips/blocks external `<script>` tags for security. The Momence widget script (`momence.com/plugin/host-schedule/host-schedule.js`) simply never executed.

**The fix:** Enabled GitHub Pages on the repo. GitHub Pages is a real web server that allows all external scripts.

**Rule for future sessions:** NEVER use htmlpreview.github.io for any page that loads external JavaScript. Always use `https://marv0611.github.io/sabdawebsite/`. This includes ANY page with Momence, Meta Pixel, GA4, or any other third-party integration.

### ⚠️ 14.2 — NEVER MOVE DOM NODES INSIDE A REACT WIDGET

**The mistake:** Wrote a `moveDaySelector()` function that used `appendChild()` to physically move the Momence day selector from Momence's "second row" into the "first row" (to put the days between "Classes" and "Week/Month").

**What happened:** Momence's widget is a React application. React maintains a virtual DOM and expects its rendered nodes to stay where it put them. When JS moves a React-managed DOM node, React's reconciliation breaks — on the next re-render, React can't find the moved node in its expected parent, so it either removes it or stops updating it. Result: the left/right arrows showed up (they lived in the first row already) but all 7 day buttons (SUN–SAT) vanished.

**The fix:** Removed all DOM manipulation. Only use `element.style.setProperty()` to change visual styles, never `appendChild()`, `insertBefore()`, or `removeChild()` on widget-managed nodes.

**Rule for future sessions:** When working with any third-party widget (Momence, Stripe, Google Maps, etc.), ONLY change CSS/styles. NEVER restructure the DOM. The widget's framework controls the DOM tree.

### ⚠️ 14.3 — MOMENCE STYLED-COMPONENTS OVERRIDE CSS !important

**The mistake:** Wrote extensive CSS overrides targeting Momence class names like `.momence-day_selection-item`, `.momence-arrow-button`, etc. with `!important`. The widget controls (day selector, buttons, filters) remained invisible — dark text on dark background.

**What happened:** Momence uses styled-components (CSS-in-JS). These generate unique class hashes at runtime and inject `<style>` tags with inline styles that have HIGHER specificity than external CSS, even with `!important`. The class names in the HTML don't match the predictable `.momence-*` pattern — they're hashed (e.g., `.zh2ey8`, `.g6tqw9`, `.sc-12tukza`).

**The current approach (v10):** JavaScript that runs on a MutationObserver and timers, calling `element.style.setProperty('color', '#f0efe9', 'important')` on EVERY element inside the widget. This is a "nuclear" approach — force white text and transparent backgrounds on everything, then selectively re-color specific elements (cards get glass bg, book buttons get cyan, h3 gets salmon, etc.).

**What still doesn't fully work:** The day selector row. The widget's React re-renders overwrite inline styles set by our JS. The MutationObserver fires and re-applies, but there's a race condition — sometimes the widget wins.

**Possible solutions for next session:**
1. **Inspect live DOM in Chrome DevTools** → find the exact styled-component hash classes on the day selector buttons → target those directly in CSS
2. **Use `!important` on the widget's own `<style>` tag** → inject a `<style>` tag AFTER the widget loads, with selectors that match the hashed classes
3. **Accept Momence's native light theme for the controls** → only dark-theme the page frame (nav, hero, pricing, footer) and let the widget render in its default white theme inside a contained card

### ⚠️ 14.4 — CACHE BUSTING ON GITHUB PAGES

**The mistake:** Pushed changes but Marvyn saw the old version. Tried `?t=` query params on the URL, which don't actually bust the GitHub Pages CDN cache.

**What works:**
- Use a version comment in the HTML: `<!-- classes-v10 -->` in the `<meta charset>` tag
- After pushing, wait 30–60 seconds for rebuild
- Verify with curl: `curl -s https://marv0611.github.io/sabdawebsite/classes.html | head -4`
- If stuck, push an empty commit: `git commit --allow-empty -m "trigger rebuild" && git push`
- Tell Marvyn to open in incognito window if browser is caching

### ⚠️ 14.5 — MOMENCE i18n ATTRIBUTE MAY NOT WORK

**The mistake:** Used the `i18n` attribute on the Momence script tag to rename "Practitioners" to "Teachers":
```html
i18n='{"TEACHER_SELECT_PLACEHOLDER":"Teachers","TEACHER":"Teacher"}'
```

**What happened:** The i18n attribute works for some strings but not all. The "Practitioners" label in the dropdown filter was not reliably renamed.

**The fix:** Added JS `MutationObserver` that watches the widget DOM and replaces text nodes containing "Practitioners" with "Teachers" and "Practitioner" with "Teacher". This fires on every DOM mutation + fallback timers.

### ⚠️ 14.6 — DON'T HIDE THINGS MARVYN DIDN'T ASK TO HIDE

**The mistake:** In v6, hid the entire "Classes" header row, Week/Month toggle, SHOW ALL/TODAY buttons, Teachers filter, and tags row — everything except the day selector and class cards.

**What Marvyn actually asked:** "Remove the '1 to 99' pagination, remove the price, and add the day selector." He wanted EVERYTHING ELSE to stay.

**Rule:** Read the request literally. Only hide what is explicitly asked to be hidden. When in doubt, ask.

### ⚠️ 14.7 — VERIFY BEFORE SENDING

**The pattern that wasted time:** Pushing code, giving Marvyn the link, then him finding issues that should have been caught by checking the deployed version first.

**Rule for future sessions:**
1. Push code
2. Wait for GitHub Pages rebuild (30–60s)
3. Verify deployed version with curl (check version comment)
4. Verify key CSS/JS rules are present with grep
5. ONLY THEN send the link to Marvyn

### 14.8 — Momence Readonly API vs Write API

**Discovery:** The standard Momence API endpoints (`/v1/host/54278/sessions`, `/v1/sessions`, etc.) all return 404. The widget uses a DIFFERENT base URL:
- **Readonly (for schedule data):** `https://readonly-api.momence.com`
- **Write (for auth/booking):** `https://api.momence.com`

The readonly API doesn't require authentication for public schedule data. The write API requires OAuth2.

### 14.9 — Footer Sizing Is a Global Rule

Marvyn asked for 30% shorter footer and said "apply this to all footers." This is now a permanent design rule — every page must use the compact footer padding. See Section 13 for exact values.

### ⚠️ 14.10 — CSS VARIABLES MUST BE SET ON THE WIDGET ELEMENT, NOT :root

**The mistake:** Set `--momence-black-100` and other Momence CSS variables on `:root`. Day selector text was invisible (dark gray on dark navy).

**What happened:** Momence's JS sets CSS variables directly on the `#momence-plugin-host-schedule` element. Element-level CSS variables always beat `:root` in the cascade. So `--momence-black-100: #807D82` (dark gray, set on the element) won over `--momence-black-100: rgba(240,239,233,.35)` (light, set on :root).

**The fix (v11):** Set all 27 CSS variables on the widget element itself + its first 3 nested child divs via JS: `el.style.setProperty(k, v, 'important')`. Also set on `:root` as fallback.

### ⚠️ 14.11 — position:fixed CHILDREN ESCAPE THEIR PARENT CONTAINER

**The mistake:** Momence renders a full-screen modal overlay (`sc-iemygx-1`) with `position:fixed; top:0; left:0; right:0; bottom:0`. My blanket "transparent backgrounds" made the backdrop invisible, but the day selector inside it was rendering at the top of the viewport, covering the nav bar.

**The fix (v14):** Added `transform: translateZ(0)` on `#momence-plugin-host-schedule`. Per CSS spec, when any ancestor has a `transform`, `position:fixed` children become positioned relative to that ancestor instead of the viewport. This traps all Momence's fixed-position elements inside the widget container.

**Rule:** Always set `transform: translateZ(0)` on third-party widget containers to prevent their `position:fixed` elements from escaping.

### ⚠️ 14.12 — TEACHERS DROPDOWN RENDERS BEHIND CLASS CARDS

**The problem:** The Teachers dropdown popup appeared behind/underneath the class cards when scrolling.

**The fix (v16):** Set `z-index:999` and `position:absolute` on the dropdown popup elements, plus `z-index:10` on the filter row (third_row) — both in CSS and via JS on every mutation.

### 14.13 — LOGO FILE NAME

The correct logo file is `SABDA white logo.png` (with spaces). URL-encoded: `SABDA%20white%20logo.png`. The file `SABDA_white.png` does NOT exist — using it shows a broken image icon. Always use:
```
https://raw.githubusercontent.com/marv0611/sabdawebsite/main/SABDA%20white%20logo.png
```
Logo height: **34px** (increased from 27px per Marvyn's request).

### 14.14 — ANCHOR LINKS NEED DEFERRED SCROLL

**The problem:** Clicking "Pricing" from the homepage navigated to `classes.html#pricing` but landed at the top of the page, not at the pricing section.

**What happened:** The Momence widget's heavy JS loading causes layout shifts that break the browser's native scroll-to-hash behavior.

**The fix:** Added a deferred `scrollIntoView` script on classes.html that fires 800ms after load:
```js
if(window.location.hash){
  setTimeout(()=>{
    const target=document.querySelector(window.location.hash);
    if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
  },800);
}
```

---

## 15. CURRENT NAV STRUCTURE (Global — applies to ALL pages)

### Nav Links
| Label | Destination |
|-------|------------|
| SABDA logo (34px) | `SABDA_v16.html` (homepage) |
| Classes | `classes.html` |
| Pricing | `classes.html#pricing` |
| Rent & Corporate | `rent-corporate.html` |
| Listening Sessions | `#` (TBD) |
| About | `#` (TBD) |
| **Instagram** (salmon pink button, cyan icon) | `https://instagram.com/sabdastudio` |

### Homepage CTAs → Destinations
| CTA | Destination | Notes |
|-----|-------------|-------|
| Hero: "3 Classes for €48" | `classes.html` | Links to schedule, NOT directly to Momence |
| "View Full Schedule" | `classes.html` | In classes gallery section |
| "See all our offers →" | `classes.html#pricing` | Below pricing cards |
| "Book Now" (sticky bar) | `classes.html` | Bottom of page |
| "Get Started" | `momence.com/m/443935` | Intro 3-pack card — DO NOT CHANGE |
| "Join Now" | `momence.com/m/431216` | Unlimited Monthly card — DO NOT CHANGE |
| "Start Unlimited" | `momence.com/m/445600` | 3-Month card — DO NOT CHANGE |
| "Explore Our Space →" | `rent-corporate.html` | Below pricing — DO NOT CHANGE |

---

## 16. CURRENT FILE VERSIONS

| File | Version Tag | Last Commit |
|------|------------|-------------|
| `SABDA_v16.html` | `v16.q` | Nav: IG button, Pricing link, hero→classes.html |
| `classes.html` | `classes-v17` | TODAY/TOMORROW/SHOW ALL buttons, Show More, Teachers compact, active highlight |
| `pricing.html` | `pricing-v1` | Standalone pricing page with memberships + intro packs |
| `rent-corporate.html` | `rc.b` | Placeholder — needs full build |
| `SABDA_Website_Build_Manual.md` | — | Session 4 update |

---

## 17. SESSION 4 — CLASSES PAGE REFINEMENTS (March 14, 2026)

### What Was Built / Changed

**classes.html changes:**
- Removed all broken day selector manipulation (auto-click, TOMORROW button, past day hiding via index)
- Added TOMORROW button via cloneNode from TODAY (inside `hideElements → qf._reordered`)
- Reordered quick filters: TODAY | TOMORROW | SHOW ALL
- Auto-click TODAY on page load (timers at 800/1500/2500ms)
- Active filter highlight using `data-sabda-filter` attribute + `applyActiveState()` function
- Show More button (lives OUTSIDE widget div, immune to forceStyles)
- Teachers dropdown compacted (140px, flex:0 0 140px)
- Spacer div between SHOW ALL and Teachers killed (`display:none`)
- Widget bottom padding reduced (60px → 20px desktop, 40px → 12px mobile)

**pricing.html created:**
- Standalone pricing page with moon visual hero (`Sabda_20240118_010.jpg`)
- Memberships first (Monthly €130, 3-Month €100/mo with "Best Value" badge)
- Intro offers below (Trial €16, 3-Pack €48 "Most Popular", 5-Pack €80, 10-Pack €140)
- Gift cards section
- "View Schedule & Book" CTA → classes.html
- Same nav/footer as all pages

### Current Widget Architecture (classes.html)

**Rows visible:**
- `first_row`: "Classes" button + Week/Month toggle
- `second_row`: Day selector (Sun–Sat with < > arrows)
- `third_row`: TODAY | TOMORROW | SHOW ALL | Teachers dropdown

**Rows hidden:**
- `sys_row` (system/admin row)
- Locations dropdown (last child of session_filters)
- Price on cards (`183txmy`)
- Pagination (`1rbd2nr`)
- Powered by Momence (`1u5l2dx`)
- In-person location on cards (`in_person`)

**Show More button:**
- `#sabda-show-more-btn` div lives OUTSIDE `#momence-plugin-host-schedule`
- This is CRITICAL — it must stay outside so `forceStyles()` doesn't touch it
- Button class: `.sabda-show-more`
- Click behavior: +1 day in SHOW ALL mode; switches to SHOW ALL if in TODAY/TOMORROW mode

**Active filter highlight:**
- Tracked by `activeFilter` variable ('today' | 'tomorrow' | 'all')
- Applied via `applyActiveState()` which runs AFTER `forceStyles()` in `runAll()`
- Uses inline styles (not CSS classes) because Momence React re-renders wipe out CSS classes
- Each filter button has `data-sabda-filter` attribute for identification

---

## 18. SESSION 4 — CRITICAL LESSONS LEARNED

### ⚠️ 18.1 — ALWAYS CACHE-BUST LINKS FOR MARVYN
GitHub Pages caches aggressively. After EVERY push, append `?v=N` or `?nocache=X` to the URL. Marvyn checks on Safari/Chrome which both cache hard. If he says "nothing changed" — it's always the cache, not the code. Tell him to do Cmd+Shift+R (Mac hard refresh).

**Rule:** After every `git push`, wait 60 seconds, then provide the link with a new cache-buster param. Never reuse the same `?v=` value.

### ⚠️ 18.2 — PIXEL-PERFECT DETAILS MATTER
Marvyn notices every pixel. Spacing between buttons, width of dropdowns, alignment of elements — these are not "nice to haves." If he says "fix the spacing" and you push a change that's 90% there, he WILL send it back. Get it right the first time:
- Always check ALL padding, margin, gap values
- If adjusting flex layouts, set `flex`, `margin`, `padding` AND `gap` — don't assume one property is enough
- Momence styled-components inject their own margin/padding — you must override ALL of them with `!important`
- When targeting a container, also target its children (`> div`) because Momence nests wrappers

### ⚠️ 18.3 — forceStyles() BLANKET OVERRIDES DESTROY CUSTOM ELEMENTS
The `forceStyles()` function loops over `el.querySelectorAll('*')` and sets `background:transparent` and `color:white` on everything. This DESTROYS any custom styling on buttons, highlights, or injected elements.

**Solution pattern:**
1. Check for custom classes EARLY in the loop and `return` to skip
2. For active states: use inline styles applied AFTER forceStyles (not CSS classes — React wipes them)
3. For injected buttons: place them OUTSIDE the `#momence-plugin-host-schedule` div entirely

**Exclusion checklist in forceStyles:**
```javascript
if(tag==='IMG')return;
if(node.classList&&node.classList.contains('sabda-show-more'))return;
if(node.closest&&node.closest('.sabda-show-more'))return;
// For active buttons — handle in the background override chain:
}else if(node.classList&&node.classList.contains('sabda-active')){
  // cyan highlight styles
}else{
  // transparent background
}
```

### ⚠️ 18.4 — MOMENCE DAY SELECTOR IS A FIXED SUN–SAT WEEK
Cannot merge two weeks into one view. The widget renders one Sun–Sat week at a time. Future days from the next week don't exist in the DOM until `>` is clicked. Don't try to build a "rolling 7 days" view — it's architecturally impossible without breaking React.

**What works:** Hiding past days via `disabled` attribute. But this means on Saturday (last day), only 1 day shows. The solution was to just leave the day bar as-is (all 7 days visible) and let the quick filter buttons (TODAY/TOMORROW/SHOW ALL) handle the UX.

### ⚠️ 18.5 — DOM INSPECTION IS REQUIRED FOR MOMENCE FIXES
Do NOT guess Momence's DOM structure. Every failed fix in Session 3 was caused by guessing class names, element hierarchy, or data attributes. The DOM dump from Marvyn (Session 4) finally resolved all targeting issues.

**Key selectors confirmed from real DOM:**
- Day buttons: `button.momence-day_selection-item` with `data-is-today`, `data-is-selected`, `disabled`
- Day name: `.momence-day_selection-item_day` (div inside button)
- Day number: `.momence-day_selection-item_highlight` (div inside button)
- Date labels: `time.momence-host_schedule-session_list-date_label` (TODAY, TOMORROW, NEXT Monday...)
- Session cards: `article[data-session_id]`
- Quick filters: `.momence-quick_filters-today`, `.momence-quick_filters-all`
- Arrow buttons: `.momence-day_selection-arrow_left`, `.momence-day_selection-arrow_right`
- Teachers dropdown: `.momence-select` → `.momence-select-button`
- Spacer div (between filters and Teachers): `[class*="fqxJDI"]` — KILL IT with display:none

### 18.6 — Show More Button Placement
The Show More button MUST live outside `#momence-plugin-host-schedule`. If placed inside:
- `forceStyles()` sets its background to transparent
- `forceStyles()` sets its text color to white
- Even with exclusion checks, timing issues cause flashes

Current placement: `el.parentElement.insertBefore(btn, el.nextSibling)` — this puts it between the widget and the pricing summary section.

---

## 19. PENDING WORK (as of Session 4 end)

### Immediate Priority (next session)
- [ ] **Show More spacing** — button still overlaps the horizontal line below the last class card. Needs proper margin/padding between last article and the button.
- [ ] **Active filter button bug** — clicking between TODAY/TOMORROW/SHOW ALL feels slow/buggy. The highlight sometimes doesn't switch instantly. Root cause: `allBtn.click()` triggers Momence's internal handler which re-renders, then `applyActiveState()` runs on MutationObserver but the timing creates a flash. Investigate debouncing or using `requestAnimationFrame`.
- [ ] **Member login portal** — needs Momence API credentials (client_id + client_secret from Marvyn). Plan: add login button to nav, Momence member portal integration.

### Blocked
- [ ] Momence API credentials (client_id + client_secret) — Marvyn needs to provide
- [ ] Language selector (ES/CA pages don't exist yet)

### Future
- [ ] Mobile responsive pass (all pages)
- [ ] Meta Pixel integration (ID: 567636669734630)
- [ ] Homepage mobile sticky CTA bar
- [ ] Rent & Corporate page (full build)
- [ ] About page
- [ ] Listening Sessions page

---

## 20. MOMENCE WIDGET — DEFINITIVE DOM REFERENCE

Captured from Chrome DevTools, March 14, 2026. These are the REAL selectors — never guess.

```
#momence-plugin-host-schedule
  └── .momence-host-schedule-layout (sc-14are4x-0)
      └── .momence-host_schedule (sc-z0wwj1-0)
          ├── .momence-host_schedule-sys_row [HIDDEN]
          ├── .momence-host_schedule-first_row
          │   ├── .momence-event_type_select (Classes button)
          │   └── .momence-view-toggle (Week/Month)
          ├── .momence-host_schedule-list_view
          │   ├── .momence-host_schedule-second_row
          │   │   └── .momence-day_selection
          │   │       ├── button.momence-day_selection-arrow_left
          │   │       ├── nav.momence-day_selection-list
          │   │       │   └── button.momence-day_selection-item (×7)
          │   │       │       ├── div.momence-day_selection-item_day ("Sun")
          │   │       │       ├── div.momence-day_selection-item_highlight ("8")
          │   │       │       └── div.momence-day_selection-item_num-days ("• •")
          │   │       └── button.momence-day_selection-arrow_right
          │   ├── .momence-host_schedule-third_row
          │   │   ├── .momence-quick_filters
          │   │   │   ├── button.momence-quick_filters-all ("SHOW All")
          │   │   │   └── button.momence-quick_filters-today ("TODAY")
          │   │   ├── div[class*="fqxJDI"] (spacer — HIDDEN)
          │   │   └── .momence-session_filters
          │   │       ├── .momence-select (Teachers) [VISIBLE]
          │   │       └── .momence-select (Locations) [HIDDEN]
          │   └── .momence-host_schedule-session_list
          │       ├── time.date_label ("TODAY")
          │       ├── article[data-session_id] (class card)
          │       ├── time.date_label ("TOMORROW")
          │       ├── article[data-session_id]
          │       └── ...
          ├── nav.momence-pagination [HIDDEN]
          └── a.momence-host_schedule-powered_by_momence [HIDDEN]
```

---

*End of manual. Last updated March 14, 2026 — end of Session 4.*
