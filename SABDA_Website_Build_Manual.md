# SABDA Website Build — Project Manual
## For AI Chat Handoff & Developer Reference
### Last Updated: March 12, 2026 — v16 (Session 2 Final)

---

## QUICK START FOR NEXT CHAT

Paste this at the beginning of your next chat:

> I'm continuing the SABDA website build. Read the project manual first — it's at `SABDA_Website_Build_Manual.md` in the GitHub repo (https://github.com/marv0611/sabdawebsite). The current working file is `SABDA_v16.html`. Use this GitHub PAT for pushing: `YOUR_GITHUB_PAT_HERE`. Clone the repo, read the manual thoroughly before making any changes, and present the HTML file after each edit so I can review it. After every push, give me the htmlpreview link so I can check in my browser.

**CRITICAL — PREVIEW LINK FORMAT:**
After every push, always provide this link in the chat so Marvyn can open it directly in his browser:
```
https://htmlpreview.github.io/?https://raw.githubusercontent.com/marv0611/sabdawebsite/main/SABDA_v16.html
```
Do NOT give raw GitHub links (they download instead of rendering). Do NOT give repo links. Always give the htmlpreview.github.io link. This is non-negotiable.

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
WRONG (downloads file): https://raw.githubusercontent.com/marv0611/sabdawebsite/main/SABDA_v16.html
WRONG (repo view):      https://github.com/marv0611/sabdawebsite/blob/main/SABDA_v16.html
RIGHT (renders in browser): https://htmlpreview.github.io/?https://raw.githubusercontent.com/marv0611/sabdawebsite/main/SABDA_v16.html
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

### Next Session Priority
- [ ] Mobile responsive pass (most traffic comes from Instagram ads on phones)
- [ ] Review space gallery — may need better photos
- [ ] Testimonials need real quotes (current ones are placeholders)

### Additional Pages to Build
- [ ] `/welcome/` — ads landing page (exists as `welcome.html` — needs sync with v16 design)
- [ ] `/classes/` — all class types, Momence schedule embed
- [ ] `/pricing/` — full pricing page with all packs and memberships
- [ ] `/the-space/` — technology showcase, gallery, specs
- [ ] `/rent-corporate/` — B2B page with inquiry form
- [ ] `/listening-sessions/` — paused, signup for notifications
- [ ] `/about/` — origin story, mission, values, team
- [ ] `/contact/` — address, map, form

### Technical Integration
- [ ] Meta Pixel (ID: `567636669734630`)
- [ ] Momence schedule widget (`host_id: 54278`)
- [ ] EN/ES language toggle
- [ ] GA4 + GTM configuration

---

## 10. INTEGRATION REQUIREMENTS

### Momence
- **Host ID:** 54278
- **API Token:** a0314a80ca
- **Schedule Widget:**
```html
<div id="ribbon-schedule"></div>
<script async type="module" host_id="54278" locale="en"
  src="https://momence.com/plugin/host-schedule/host-schedule.js">
</script>
```

### Meta Pixel
- **Pixel ID:** 567636669734630
- **Events needed:** PageView, ViewContent, InitiateCheckout, AddToCart, Purchase (CAPI), Lead

---

## 11. KEY URLS & CREDENTIALS

| Item | Value |
|------|-------|
| GitHub repo | https://github.com/marv0611/sabdawebsite |
| GitHub PAT | `YOUR_GITHUB_PAT_HERE` |
| HTML Preview | https://htmlpreview.github.io/?https://raw.githubusercontent.com/marv0611/sabdawebsite/main/SABDA_v16.html |
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
| `SABDA_v16.html` | **Current working homepage** |
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
| v16 | Streamlined flow, global particles, animated counters, dual-row gallery, 3-card pricing, premium partners marquee | **Current** |

---

*End of manual. Last updated March 12, 2026 — end of Session 2.*
