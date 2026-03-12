# SABDA Website Build — Project Manual
## For AI Chat Handoff & Developer Reference
### Last Updated: March 12, 2026 — v16

---

## QUICK START FOR NEXT CHAT

Paste this at the beginning of your next chat:

> I'm continuing the SABDA website build. Read the project manual first — it's at `SABDA_Website_Build_Manual.md` in the GitHub repo (https://github.com/marv0611/sabdawebsite). The current working file is `SABDA_v16.html`. Use this GitHub PAT for pushing: `YOUR_GITHUB_PAT_HERE`. Clone the repo, read the manual thoroughly before making any changes, and present the HTML file after each edit so I can review it.

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
| Salmon | `#F8A6A3` | Accent, italic text, secondary highlights |
| Cyan | `#02F3C5` | CTAs, labels, interactive elements, accent numbers |
| Blended Mid-tone | `#7fcdb5` | Used in some particle/gradient elements |
| Warm White | `#f0efe9` | Body text, headings |
| Muted White 60% | `rgba(240,239,233,.6)` | Body copy |
| Muted White 38% | `rgba(240,239,233,.38)` | Secondary text, descriptions |

### Typography
| Role | Font | Weight | Notes |
|------|------|--------|-------|
| Headings | PT Serif | 400, 700, italic | Google Fonts. Eugusto Bold is the brand font but doesn't load reliably from GitHub |
| Body | DM Sans | 300, 400, 500, 600 | Clean modern sans-serif |
| Logo | Eugusto Bold | — | Use the white logo PNG, never render as text |

### Design Principles (from Marvyn, confirmed through multiple iterations)
- **Dark, immersive feel** — like stepping from a noisy Barcelona street into the 360° projection room
- **NO section boundaries** — single continuous `#0e1235` background
- **Global particle field** — the entire page lives inside a floating particle nebula (salmon + cyan particles, mouse-repulsive)
- **NOT:** woo-woo, esoteric, hippie, basic yoga studio aesthetic, generic template look
- **Think:** teamLab meets Soho House meets a really good Berlin club that also does yoga
- **Brand pillars:** Art · Tech · Wellness

### Brand Equities (from Brand Foundations PDF)
- Primary symbol: Cymatic-inspired concentric circle patterns
- Logo font: Eugusto Bold (salmon on navy, or white on navy)
- Sonic identity: Jon Hopkins, Max Cooper, Ben Böhmer, Brian Eno, Bicep
- Needscope positioning: Brown/Blue quadrant — Thoughtful, Composed, Intelligent, Discerning
- Personality: Clever, witty, thought-provoking, down-to-earth

---

## 3. TECH STACK & WORKFLOW

### Decision: Single HTML file → paste into Framer for hosting

**What we tried and rejected:**
1. Framer with Asana yoga template — looked "basic" and "templated"
2. Framer code components via MCP — slow workflow, MCP disconnects
3. Framer template + custom code hybrid — Marvyn: "If you're writing custom code anyway, why use a template?"

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

# IMPORTANT: Always present_files after edits so Marvyn can preview
```

### Video Files — LFS
Video files in the repo use Git LFS. The `raw.githubusercontent.com` URL returns a LFS pointer, NOT the video.
Use the **media URL** instead:
```
WRONG: https://raw.githubusercontent.com/marv0611/sabdawebsite/main/0312.mp4
RIGHT: https://media.githubusercontent.com/media/marv0611/sabdawebsite/main/0312.mp4
```

### Image Files — Direct
Image files (PNG, JPG) load fine from raw GitHub:
```
https://raw.githubusercontent.com/marv0611/sabdawebsite/main/SABDA%20white%20logo.png
```

---

## 4. CURRENT BUILD STATUS (v16)

### File: `SABDA_v16.html`

This is the active homepage. ~920 lines. Fully self-contained.

### What's in v16 — confirmed working:

**Loader**
- 9 animated concentric rings (cymatic pattern, SABDA colors)
- "Enter the Void" text fades in/out
- Dismisses after 850ms on page load

**Custom Cursor**
- SABDA pink symbol PNG as cursor (28px)
- Salmon-tinted ring follower with spring physics
- Scales up on hover over interactive elements

**Global Particle Field**
- Fixed canvas behind entire page (z-index:1)
- 800 particles, salmon + cyan, soft glow
- Mouse repulsion physics (120px radius)
- Runs continuously — all content sits above at z-index:2

**Nav**
- Semi-transparent: `rgba(14,18,53,.45)` + `backdrop-filter:blur(14px)`
- Darkens on scroll: `rgba(14,18,53,.88)`
- Logo left, links center (Classes, Space, Pricing, Contact), CTA right ("Book a Class" → momence.com/m/443935)
- Links: white at 75% opacity, full on hover

**Hero**
- Full-viewport video background (`0312.mp4` via LFS media URL)
- Video: `playbackRate=0.55` (cinematic slow), CSS filter: `contrast(1.12) saturate(1.15) brightness(1.03)`
- Gradient overlay (navy from bottom)
- Top label: "Art · Tech · Wellness"
- H1: "The Future of Wellness"
- Single CTA: "3 Classes for €48" (cyan button)
- Note below CTA: "€16/class · New students · No commitment"
- Scroll indicator at bottom

**Trust Row**
- Immediately after hero
- Stars 4.8 ClassPass · 15,000+ reviews | Stars 4.8 Google · 120+ reviews

**Stats Strip**
- 4 items, centered, with vertical divider lines between:
  - **360°** Immersive Projections (360° in cyan accent)
  - **Dolby Atmos** Spatial Audio
  - **42** Classes per Week
  - **Eixample** In the Heart of Barcelona
- Font size: 2.2rem values, 0.68rem labels
- Padding: 72px top/bottom

**Partners Marquee**
- "Trusted by leading brands"
- Auto-scrolling horizontal marquee: Apple · Nike · Alpro · Offline Club · ClassPass · Urban Sports Club · Wellhub · Luma · Resident Advisor
- CSS animation, duplicated track for seamless loop

**Classes**
- Header: "Move. Breathe. Tune In." + "View Full Schedule" button
- 6 cards in 3-column grid, each with:
  - Background image from GitHub
  - Magnetic 3D tilt on hover (±10deg)
  - Hover parallax effect
  - Class name + one-line description
  - "Explore →" link
- Classes: Vinyasa Yoga, Sound Healing, Breathwork, Pilates, Ecstatic Dance, Meditation Journeys

**Space Gallery**
- Full-bleed 5-slide carousel
- Image slides with photographer-style captions
- Prev/next navigation dots
- Each slide: `object-fit:cover`, full viewport width

**Testimonials**
- 4 rotating quotes with auto-advance (6s interval)
- Dot navigation
- Names + class type attribution

**Booking Section**
- Two cards side by side:
  - Primary (large): €48 3-Pack — "Recommended" badge, cyan CTA
  - Secondary (small): €16 Single Class
- Both link to Momence

**Location**
- Address: C/ Muntaner 83B, Local 2, 08011 Barcelona
- Directions: 10 min Universitat metro, 5 min Passeig de Gràcia
- Google Maps iframe embed

**Footer**
- 4-column: Brand info, Explore links, Connect links, Contact details
- © 2026 SABDA STUDIO S.L.

**Mobile Sticky Bar**
- Hidden on desktop, visible on mobile after scrolling past hero
- "3 Classes — €48 · €16/class" + "Book Now" button

---

## 5. PAGE ARCHITECTURE & FLOW

The homepage flow was designed using findings from Jongmans et al. (2022) — "The Role of Visual Design in Website Conversion":

```
Visual Design → Usability → Pleasure → Conversion
```

Each section builds on the previous:

```
HERO (wow + clarity — 3 seconds to understand)
  ↓
TRUST (credibility priming — ratings immediately)
  ↓
STATS (what makes this different — 360°, Dolby, 42 classes, Barcelona)
  ↓
PARTNERS (brand association — "if Apple trusts them...")
  ↓
CLASSES (the product — show me what I'm buying)
  ↓
SPACE GALLERY (the "wow" moment — full-bleed immersive photos)
  ↓
TESTIMONIALS (confirmation — other people loved it)
  ↓
BOOKING (action — clear pricing, single primary CTA)
  ↓
LOCATION (logistics — where is this place)
  ↓
FOOTER
```

**Key principle:** Minimize friction between "I'm interested" and "show me what you offer." Previous versions had a manifesto section with paragraphs of text + a 3D animated symbol between hero and classes. This was removed because it was a speed bump that broke the conversion chain.

---

## 6. CRITICAL LESSONS — DO NOT REPEAT

### 6.1 ONLY Change What Is Asked

This is the most important lesson. If Marvyn says "update the number of classes to 42," update ONLY that number. Do not rearrange sections, move content between sections, add or remove elements, or "improve" things that weren't mentioned. This was a specific mistake in this session — moving 360°/Dolby Atmos from the stats strip to the classes header when only the class count was supposed to change. It had to be reverted.

### 6.2 Rendering Quality

**The Claude preview is not a real browser.** The HTML file must be opened in a real browser to evaluate visual quality. Always push to GitHub AND present the file so Marvyn can open it locally.

**CSS filters are the limit of client-side video sharpening.** The hero video uses `contrast(1.12) saturate(1.15) brightness(1.03)` and `playbackRate=0.55`. True sharpening (unsharp mask, higher bitrate) requires re-encoding the source video in editing software — CSS/JS cannot do this.

**Git LFS videos don't serve from raw.githubusercontent.com.** Always use:
```
https://media.githubusercontent.com/media/marv0611/sabdawebsite/main/FILENAME.mp4
```

### 6.3 3D Animations — Concentric Rings Symbol (REMOVED)

We spent significant time building the SABDA cymatic symbol as an animated 3D element using Three.js. **It was ultimately removed.** Lessons if it's ever revisited:

- **A flat circle rotating around its center Z-axis is visually identical at every angle.** You must TILT each ring on a different axis first, then rotate on a perpendicular axis so the rotation is visible.
- **Container overflow/positioning is tricky.** Using `inset:-25%; width:150%` caused the symbol to render offset to the bottom-right corner. Simple `inset:0; width:100%; height:100%` with appropriate camera FOV works better.
- **Tube thickness:** Brand symbol has hairline strokes. `tube=0.002` is barely visible; `tube=0.005` is too thick; `tube=0.003` was the sweet spot.
- **Three.js adds ~150KB.** Only worth it if the animation is central to the design.
- **Final decision:** Removed entirely. The manifesto section it lived in was killed because it didn't serve the conversion flow.

### 6.4 Particle Systems

- **Global field > section dividers.** Individual particle canvases per section gap required 3000+ particles each and having 4 was heavy. A single global fixed canvas with 800 particles behind the entire page looks better and performs better.
- **Mouse repulsion needs `pointer-events:none`** on the canvas so it doesn't block clicks on content above.
- **Particle visibility on dark backgrounds:** Use radial gradients with multiple color stops (core → glow → fade). Opacity range: 0.015–0.08 base with 0.4–0.6 pulse modulation.

### 6.5 Layout & Spacing

- **All sections: 120px top/bottom padding on desktop, 80px on mobile.** Don't change without being asked.
- **Section backgrounds should be transparent** so the global particle field shows through. Only the hero (video) and space gallery (images) have opaque backgrounds.
- **z-index hierarchy:** particles (1) → content sections (2) → grain texture (9000) → nav (100) → cursor (9999)

### 6.6 Design Strategy

- **Kill sections that don't serve conversion.** The manifesto was impressive design but added scroll distance between "interested" and "buy."
- **Trust indicators go immediately after the hero.** Don't bury them.
- **Single CTA in the hero.** One button + supporting note underneath. Not two buttons.
- **The €48 3-pack is always the primary offer.** Every CTA defaults to this. €17 single class is always secondary/smaller.
- **Don't add text that explains what the video already shows.** The hero subline about 360° projections was removed because the video communicates this visually.

### 6.7 Working Style with Marvyn

- He gives precise, specific feedback. Execute exactly what's asked — nothing more, nothing less.
- He reviews in a real browser, not the Claude preview. Always push to GitHub.
- He sends screenshots of issues. Read them carefully before coding.
- He thinks strategically — he'll question whether a section should exist at all.
- When he says "improve it," he means a meaningful quality jump, not a small tweak.

---

## 7. CONVERSION STRATEGY

### Psychology Foundation (Jongmans et al. 2022)
Visual Design → Perceived Usability → Pleasure → Purchase Intention

Applied to SABDA:
- **Visual Design:** Dark immersive theme, particles, video hero, high-quality photography = "this is premium"
- **Usability:** Single CTA, clear pricing, trust indicators, clean nav = "this is easy"
- **Pleasure:** The scroll journey feels like entering the space physically = "this feels good"
- **Action:** €48 3-pack is always the obvious choice = "I'll try it"

### Key Conversion Data (from Meta Ads analysis)
- Current blended CAC: €9.19
- Intro-to-membership conversion: ~5.6%
- 2nd visit return rate: 12.3% within 14 days
- 68% of trial users never return after 1 class
- ~82 active memberships (target: 150+ in 90 days)

### Pricing Structure
| Offer | Price | Momence URL |
|-------|-------|-------------|
| **Intro 3-Pack** (PRIMARY) | €48 (€16/class) | momence.com/m/443935 |
| Single Drop-In | €17 | momence.com/m/443934 |
| BCN Resident Week | €50 | momence.com/m/443641 |
| 5-Pack | €80 | momence.com/m/443937 |
| 10-Pack | €140 | momence.com/m/443939 |
| Monthly Membership | €130/mo | momence.com/m/431216 |
| 3-Month Membership | €300 (€100/mo) | momence.com/m/445600 |
| Listening Session | €16 | momence.com/m/556050 |
| Gift Card | Variable | momence.com/gcc/54278 |

---

## 8. ASSET INVENTORY

### Images (load from raw GitHub)
| File | Content | Used In |
|------|---------|---------|
| `SABDA%20white%20logo.png` | White SABDA wordmark | Nav |
| `SABDA%20symbol%20pink.png` | Pink cymatic symbol | Custom cursor |
| `SABDA%20symbol%20multi-colored%20(1).png` | Multi-colored cymatic symbol | Reference only |
| `Sabda_20240118_016.jpg` | Yoga class in immersive room | Vinyasa card |
| `Sabda_20240118_010.jpg` | Sound healing / dark room | Sound Healing card |
| `Sabda_20240118_009.jpg` | Breathwork / aurora scene | Breathwork card |
| `Sabda_20240118_005.jpg` | Pilates / underwater scene | Pilates card |
| `IMG-26.jpg` | Aurora room / meditation | Meditation card |
| `IMG-19.jpg` | Concert/event scene | Ecstatic Dance card |
| `IMG-27.jpg` | Space gallery slide |
| `IMG-5%20(1).jpg` | Lounge area | Space gallery |
| `IMG-7%20(1).jpg` | Space photo | Space gallery |
| `KR233837.jpg` | Space photo | Space gallery |
| `cover%20insta.jpg` | Space photo | Space gallery |

### Videos (load from LFS media URL)
| File | Content | Used In |
|------|---------|---------|
| `0312.mp4` | Hero video (49MB) | Hero section |
| `45 classes.mp4` | Class footage | Available, not used |
| `classes 2 4.5.mp4` | Class footage | Available, not used |
| `new awareness 4.5.mp4` | Awareness video | Available, not used |

### Fonts
Custom Eugusto Bold .woff files exist in repo but **don't load reliably** from GitHub (CORS/MIME issues). Use Google Fonts PT Serif + DM Sans. Use the logo PNG for the SABDA wordmark.

---

## 9. PENDING WORK

### Next Session Priority
- [ ] Mobile responsive pass (most traffic comes from Instagram ads on phones)
- [ ] Review space gallery — may need better photos
- [ ] Verify hero video quality in real browser

### Additional Pages to Build
- [ ] `/welcome/` — ads landing page (exists as `welcome.html` — needs sync with v16 design)
- [ ] `/classes/` — all class types, Momence schedule embed
- [ ] `/pricing/` — intro offers, packs, memberships
- [ ] `/the-space/` — technology showcase, gallery, specs
- [ ] `/rent-corporate/` — B2B page with inquiry form → connect@sabdastudio.com
- [ ] `/listening-sessions/` — paused, signup for notifications
- [ ] `/about/` — origin story, mission, values, team
- [ ] `/contact/` — address, map, form

### Technical Integration
- [ ] Meta Pixel (ID: `567636669734630`)
- [ ] Fix checkout pixel (CAPI server-side)
- [ ] Momence schedule widget (`host_id: 54278`)
- [ ] Corporate inquiry form
- [ ] EN/ES language toggle
- [ ] GA4 + GTM configuration

### Content Still Needed
- [ ] Case studies from Juliet
- [ ] Confirmed partner/press logos
- [ ] Teacher profiles and photos
- [ ] Real testimonials with permission
- [ ] High-res gallery photos

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
- **Status:** Checkout pixel broken. Gloria is supposed to fix.

---

## 11. KEY URLS & CREDENTIALS

| Item | Value |
|------|-------|
| GitHub repo | https://github.com/marv0611/sabdawebsite |
| GitHub PAT | `YOUR_GITHUB_PAT_HERE` |
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
- **IBAN:** ES20 2100 0801 1402 0120 3441
- **BIC:** CAIXESBBXXXCAIXA

---

## 12. FILE INDEX

| File | Description |
|------|-------------|
| `SABDA_v16.html` | **Current working homepage** |
| `welcome.html` | Ads landing page — needs sync with v16 |
| `SABDA_Website_Build_Manual.md` | This document |
| `SABDA_Brand_Foundations.pdf` | Brand strategy deck |
| `SABDA_Website_Copy_v1.md` | Page-by-page website copy |
| `SABDA_SEO_Competitive_Analysis_Prompt.md` | SEO prompt (not yet run) |
| `SABDA_Notion_Full_Workspace_Extraction_March2026.md` | Notion data |
| `SABDA_Notion_Marketing_Extraction_March2026.md` | Marketing Notion data |
| `Meta_Ads_Chat_Summary_March_2026.md` | Meta Ads analysis |

### Version History
| Version | Key Change | Status |
|---------|------------|--------|
| v12 | Images from GitHub, brand navy, photo cards | Superseded |
| v13 | Animated symbol, card animations | Superseded |
| v15 | Full rebuild with particles, gallery, booking | Superseded |
| v16 | Streamlined flow, global particles, video swap, stats strip | **Current** |

---

*End of manual. Last updated March 12, 2026 after v16 session.*
