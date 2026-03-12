# SABDA Website Build — Project Manual
## For AI Chat Handoff & Developer Reference
### Last Updated: March 12, 2026

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Brand & Design System](#2-brand--design-system)
3. [Tech Stack Decision Log](#3-tech-stack-decision-log)
4. [Asset Inventory](#4-asset-inventory)
5. [Current Build Status (v13)](#5-current-build-status-v13)
6. [Page Architecture](#6-page-architecture)
7. [Mistakes Made & Lessons Learned](#7-mistakes-made--lessons-learned)
8. [Framer MCP — What Worked & What Didn't](#8-framer-mcp--what-worked--what-didnt)
9. [Pending Work](#9-pending-work)
10. [Integration Requirements](#10-integration-requirements)
11. [Key URLs & Credentials](#11-key-urls--credentials)
12. [File Index](#12-file-index)

---

## 1. PROJECT OVERVIEW

**SABDA** is an immersive audio-visual wellness studio in Barcelona. They offer yoga, pilates, sound healing, breathwork, ecstatic dance, meditation, and ice bath classes inside a 360° projection room with Dolby Atmos spatial audio.

**Why we're building this website:**
- Current site (sabda.es on WordPress/Elementor) is not conversion-optimized
- Most ad traffic converts to €17 trial instead of €48 3-pack
- No dedicated landing pages, no mobile-first design, no local SEO
- Business is preparing for a potential sale — strong web presence impacts valuation

**Key people:**
- **Marvyn Halfon** (co-founder) — leading this build, approves all design decisions
- **Juliet Levine** (co-founder) — operations, artistic core, writing case studies
- **Mark Aspinall** (CMO) — manages ads, content, Momence configuration
- **Uri Digón** — external Meta Ads manager (needs new landing page URLs + pixel events)
- **Gloria** — pixel/tracking implementation (currently blocking checkout pixel fix)
- **Katrina Affleck** — sales consultant, receives corporate inquiries at connect@sabdastudio.com

**Primary conversion goal:** Get visitors to book the **€48 intro 3-pack** (not the €17 single trial).

---

## 2. BRAND & DESIGN SYSTEM

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Brand Navy (background) | `#0e1235` | Primary background, all sections |
| Brand Navy (logo) | `#203999` | Logo color, used in Brand Foundations PDF |
| Salmon | `#F8A6A3` | Accent, italic text, secondary highlights |
| Cyan | `#02F3C5` | CTAs, labels, interactive elements |
| Warm White | `#f0efe9` | Body text, headings |
| Muted White | `rgba(240,239,233,.38)` | Secondary text, descriptions |

### Typography
| Role | Font | Weight | Notes |
|------|------|--------|-------|
| Headings | PT Serif | 400, 700, italic | Loaded from Google Fonts. Brand font is Eugusto Bold but it's a custom .woff that doesn't reliably load in browsers from GitHub raw URLs |
| Body | DM Sans | 400, 500, 600, 700 | Clean, modern, pairs well with PT Serif |
| Logo | Eugusto Bold | 700 | Custom font — use logo PNG instead of rendering text |

### Design Principles (from Marvyn)
- **Dark, immersive feel** — like stepping from a noisy Barcelona street into the 360° projection room
- **NO section boundaries** — single continuous `#0e1235` background, sections blend with radial gradients
- **NO hard lines or SVG waves** between sections
- **Organic shapes** — morphing blobs, cymatic ring patterns, radial glows
- **NOT:** woo-woo, esoteric, hippie, basic yoga studio aesthetic, or generic template look
- **Think:** teamLab meets Soho House meets a really good Berlin club that also does yoga
- **Brand pillars:** Art · Tech · Wellness

### Brand Equities (from Brand Foundations PDF)
- Primary symbol: Cymatic-inspired concentric circle patterns (vibration imagery)
- Symbols come in gradient and solid variants, each evolving into the next
- Logo font: Eugusto Bold (salmon color on navy, or white on navy)
- Sonic identity reference: Jon Hopkins, Max Cooper, Ben Böhmer, Brian Eno, Bicep
- Needscope positioning: Brown/Blue quadrant — Thoughtful, Composed, Intelligent, Discerning

### Ad Personas (inform copy tone)
- **Zoë** (late 20s, expat) — remote worker, music-dependent, spiritual but NOT religious, turned off by woo-woo
- **Laia** (31, local) — creative freelancer, assumed SABDA was for expats, anti-commercial
- **Chloe** (29, tourist) — wants cool/photogenic/easy-to-book, spontaneous
- **Rob** (34, UK expat in tech) — curious about wellness, rarely sees men in wellness spaces

---

## 3. TECH STACK DECISION LOG

### Decision: Build as pure HTML → paste into Framer for hosting

**What we tried:**
1. **HTML files built in Claude** (v1-v12) — Best visual results. Marvyn liked v12 the most. Problem: fonts sometimes didn't load from GitHub raw URLs, and the video gradient transition was tricky.

2. **Framer with Asana yoga template** — Professional layout components (pricing cards, FAQ accordion, testimonials carousel) but looked "basic" and "templated." Marvyn said it wasn't custom enough.

3. **Framer code components** — Attempted to build custom React components inside Framer via MCP. Worked technically but the workflow was slow (MCP disconnects, can't preview easily).

4. **Framer template + custom code hybrid** — Tried replacing Asana template hero with custom code component while keeping template sections. Marvyn rejected this: "If you're writing custom code anyway, why use a template?"

**Final decision:** Build everything as a single HTML file with 100% custom code. When design is approved, paste into Framer as a code component for hosting. The HTML file IS the design source of truth.

### Why not just Framer native?
- Marvyn wants pixel-level control
- Template components look generic
- Custom animations (magnetic 3D tilt, cymatic rings, morphing blobs) can't be done with Framer's visual editor
- Code components in Framer are the same code as HTML — Framer is just a container

---

## 4. ASSET INVENTORY

### GitHub Repository
**URL:** https://github.com/marv0611/sabdawebsite
**Raw base URL:** `https://raw.githubusercontent.com/marv0611/sabdawebsite/main/`

### Images (confirmed working from GitHub)
| File | Content | Used In |
|------|---------|---------|
| `SABDA%20white%20logo.png` | White SABDA wordmark | Nav |
| `SABDA%20symbol%20multi-colored%20(1).png` | Multi-colored cymatic symbol | Loader (v12) |
| `SABDA%20symbol%20pink.png` | Pink cymatic symbol | Manifesto animated symbol |
| `Copy%20of%201.jpg` | Dancer silhouette with moon/sunset | Ecstatic Dance card, was manifesto blob |
| `Sabda_20240118_016.jpg` | Yoga class in immersive room | Vinyasa Yoga card, was hero image |
| `Sabda_20240118_010.jpg` | Sound healing / dark room scene | Sound Healing card |
| `Sabda_20240118_009.jpg` | Breathwork / aurora-like scene | Breathwork card |
| `Sabda_20240118_005.jpg` | Pilates / underwater-like scene | Pilates card |
| `IMG-26.jpg` | Aurora room / meditation scene | Meditation card |
| `IMG-5%20(1).jpg` | SABDA lounge/café area | About section image (Framer template) |
| `IMG-7%20(1).jpg` | Another space photo | Available but not currently used |

### Videos
| File | URL | Format | Status |
|------|-----|--------|--------|
| Hero video | `https://sabda.es/1.mp4` | MP4, vertical 4:5 | ✅ Working — hosted on current WordPress site |
| EXP2.MOV | GitHub repo | MOV | ❌ NOT WORKING — .MOV doesn't play in browsers. Needs conversion to .mp4. Also Git LFS files don't serve from raw.githubusercontent.com |

### Fonts on GitHub (NOT reliably loadable)
- `Eugusto%20Bold.woff`
- `Eugusto%20Light.woff`
- `Eugusto%20Regular.woff`

**⚠️ LESSON:** Custom .woff fonts loaded via `@font-face` from raw.githubusercontent.com are unreliable (CORS, MIME type issues). Use Google Fonts (PT Serif + DM Sans) as the working solution, and the logo PNG instead of rendering the brand font.

### Framer Uploaded Images (already in Framer CDN)
These are images uploaded during the Asana template customization phase:
- `framerusercontent.com/images/BLtNY4gMYnhNBOkNqNHTFOyFEvg.jpg` — yoga class (hero)
- `framerusercontent.com/images/4okL0lEgsz1Q66tFwfrb61tQtQ.jpg` — sound healing
- `framerusercontent.com/images/s7A9X8bjtaFdFFHaG5Ii71mvB8.jpg` — breathwork
- `framerusercontent.com/images/VWpocGD8oT9y680ulUKjdtIvbZo.jpg` — dancer/moon
- `framerusercontent.com/images/gHks5XulxC8zcm7Wh7aTHQEqnw.jpg` — lounge/café
- Plus 8 more gallery images (numbered 1-8 in Framer)

---

## 5. CURRENT BUILD STATUS (v13)

### File: `SABDA_v13.html`

**Status:** Working. All sections render. Some animations need refinement per Marvyn's feedback.

### Sections in order:

1. **Nav** — Fixed, transparent → solid on scroll. Logo left, links center, "Book a Class" CTA right (cyan button → momence.com/m/443935). Hamburger hidden on mobile.

2. **Hero** — Full viewport video background (`sabda.es/1.mp4`). Multiple gradient layers: wash (30% navy), main gradient (fades to solid navy at 95%), solid navy block at bottom 8%, radial glow accents. "Art · Tech · Wellness" label with colored spans (cyan · white · salmon). Title: "The Future of Wellness" with salmon italic on "Wellness". Scroll indicator bottom-right.

3. **Manifesto** — Two-column: text left ("The first studio where art, sound & movement become one."), animated SABDA symbol right (7 concentric rings + 2 rotating ellipses + center glow + pink symbol PNG pulsing). `#0e1235` background continuous.

4. **Classes** — "Move. Breathe. Tune In." with 6 photo cards in 3×2 grid. Each card: full-bleed background photo, gradient overlay, title, description (reveals on hover), "Explore →" CTA. Cards have: staggered scroll-reveal (fade up + scale, 130ms delay between each), magnetic 3D tilt on hover (follows cursor, 12° range), dynamic light gradient follows cursor, gradient border glow (cyan-to-salmon), shimmer light sweep, image zoom + saturation boost, cascading text reveals.

5. **Step Inside** — Cymatic rings section. 8 concentric rings with alternating salmon/cyan colors, different animation speeds and directions. 2 elliptical orbiting rings. Center glow pulse. Text centered: "Step inside. Leave the noise behind." with "Explore The Space" link.

6. **Testimonials** — Auto-rotating carousel (6-second interval) with fade transition. 4 testimonials. Arrow navigation + dot indicators (active dot expands with cyan-to-salmon gradient). Radial glow background.

7. **Trust** — Two items: ClassPass 4.8★ (15,000+ reviews) and Google 4.8★ (120+ reviews). Cyan star color.

8. **Partners Marquee** — Auto-scrolling: Apple, Alpro, Offline Club, Grupo Puig, Nike, Desigual, Time Out. Alternating salmon/cyan colors. Duplicated array for seamless loop.

9. **Booking** — "Experience it." with two cards: 3-Pack €48 (primary, cyan gradient border, "Get Started" button) and Single €16 (ghost button). "See all memberships" link below.

10. **Location** — Two-column: address + directions left, Google Maps embed right (dark-inverted filter). "Get Directions →" link.

11. **Footer** — SABDA wordmark (salmon, PT Serif), 4 columns (brand description, Explore links, Connect links, Contact info). Bottom bar: copyright + legal links. Subtle gradient line at top.

### Animation System
- `.rv` class on elements for scroll-reveal (opacity 0 → 1, translateY 28px → 0)
- IntersectionObserver at 8% threshold
- Class cards use separate JS-driven staggered reveal (not `.rv`)
- Testimonials use JS `setInterval` + manual fade

---

## 6. PAGE ARCHITECTURE

### Agreed Navigation
```
Classes | The Space | Rent & Corporate | Listening Sessions | About | Contact | [Book a Class]
```

### Pages to Build (homepage done, rest pending)
| Page | Path | Priority | Status |
|------|------|----------|--------|
| Homepage | `/` | Done | v13 built, iterating |
| Classes | `/classes/` | High | Not started |
| Individual class pages | `/classes/yoga/` etc. | Medium | Not started |
| Pricing | `/pricing/` | High | Not started |
| The Space | `/the-space/` | Medium | Not started |
| Rent & Corporate | `/rent-corporate/` | Medium | Not started |
| Listening Sessions | `/listening-sessions/` | Low | Sessions paused |
| About | `/about/` | Low | Not started |
| Contact | `/contact/` | Low | Not started |
| Ads Landing | `/welcome/` | High | Not started — stripped navigation, single CTA |
| Tourist Landing | `/visit/` | Medium | Not started |

### Homepage Flow (agreed with Marvyn)
1. Hero (video, dark, "Art·Tech·Wellness" label)
2. Manifesto — "Where art, sound & movement become one" + animated symbol
3. Classes (6 photo cards with 3D tilt)
4. Step Inside (animated cymatic rings)
5. Testimonials (carousel with arrows)
6. Trust (ClassPass 4.8★ + Google 4.8★)
7. Partners marquee
8. Booking (3-pack €48 + single €16)
9. Location + Google Maps
10. Footer

---

## 7. MISTAKES MADE & LESSONS LEARNED

### Critical Mistakes

**1. File truncation**
- Multiple times, the HTML file was silently truncated during edits (missing `</script>`, `</body>`, `</html>`)
- **Cause:** Claude's str_replace on long files can sometimes cut off the end
- **Fix:** ALWAYS validate the file after every edit: check for `</html>`, `</body>`, `</script>` at the end
- **Validation command:**
```bash
python3 -c "
with open('file.html') as f: h=f.read()
print('</html>:', '</html>' in h)
print('</body>:', '</body>' in h)
print('</script>:', '</script>' in h)
"
```

**2. .MOV files don't play in browsers**
- Marvyn uploaded `EXP2.MOV` to GitHub. I swapped the hero video URL to point to it.
- `.MOV` (QuickTime) is not natively supported in most browsers. Only `.mp4` (H.264) works universally.
- Also: Git LFS files don't serve directly from `raw.githubusercontent.com`
- **Fix:** Always convert video to `.mp4` (H.264 + AAC) before using. Host on a proper CDN or the existing WordPress site.

**3. CSS class conflicts between scroll-reveal and hover animations**
- Cards had both `class="cls-card rv"` and JS-driven staggered reveal
- The `.rv` CSS set `opacity:0; transform:translateY(28px)` and the JS also set `opacity:0; transform:translateY(50px) scale(.94)`
- These fought each other, causing cards to sometimes not appear or have broken hover states
- **Fix:** Don't mix CSS `.rv` class with JS-driven reveals on the same element. Cards use JS only; other sections use CSS `.rv` only.

**4. Magnetic tilt transition conflict**
- The hover tilt effect needs NO transition on mousemove (for instant response) but SMOOTH transition on mouseleave
- Initial implementation set transition once and it stayed, making tilt feel laggy
- **Fix:** Set `transition: 'box-shadow .3s'` on mousemove (removes transform transition), set `transition: 'transform .6s ..., box-shadow .6s'` on mouseleave. Use a `data-revealed` flag to prevent tilt before reveal animation completes.

**5. Eugusto font loading failure**
- Attempted `@font-face` loading from `raw.githubusercontent.com` — failed due to CORS/MIME issues
- **Fix:** Use Google Fonts (PT Serif for headings, DM Sans for body). Use the SABDA logo PNG instead of rendering the font.

**6. Hero video gradient transition**
- The hero video (sabda.es/1.mp4) has a lighter blue tone that doesn't match `#0e1235`
- A visible "seam" appeared where video ended and background began
- **Attempted fixes:** CSS linear-gradient overlays at various opacity stops, solid navy block at bottom
- **Current solution:** Multi-layer gradient (fades to 93% opacity at 85%, then solid navy block at bottom 8%)
- **Real fix:** Edit the actual video in Premiere to add a navy fade at the bottom, OR accept the current CSS solution which works well enough

**7. Framer MCP disconnections**
- The Framer MCP plugin disconnects frequently during long sessions
- **Fix:** User needs to reopen Framer, Cmd+K, search "MCP", reopen the plugin
- **Prevention:** Don't chain too many Framer MCP calls without checking connection

### Non-Critical Lessons

- **Image URLs with spaces:** GitHub raw URLs need `%20` encoding (e.g., `Copy%20of%201.jpg`)
- **Google Maps dark mode:** Use CSS filter `invert(90%) hue-rotate(180deg) brightness(.78) contrast(1.15)` on the iframe
- **Gradient radial glows:** Use absolute-positioned elements with large `filter: blur()` and very low opacity (0.02-0.04) for atmospheric depth without visible shapes
- **`::selection` color:** Use `rgba(248,166,163,.2)` (salmon at 20%) for on-brand text selection
- **CSS variables for colors:** Define in `:root` so they can be used throughout without repetition

---

## 8. FRAMER MCP — WHAT WORKED & WHAT DIDN'T

### Project Details
- **Published URL:** https://individual-perspective-340178.framer.app/
- **Home page ID:** `augiA20Il`
- **Desktop breakpoint node:** `WQLkyLRf1`
- **MCP URL:** `https://mcp.unframer.co/mcp?id=99bf1ed6261024af121aa3663946dd975a8747b4a96a6afb758bc06d9b3ce499`

### What Worked
- `getProjectXml` — reliable, shows full project structure
- `getNodeXml` — reliable, shows page contents
- `updateXmlForNode` — works for updating text, images, links, component props
- `manageColorStyle` — works for updating project color tokens
- `createCodeFile` — works for creating React/TSX code components
- `deleteNode` — works for removing sections

### What Didn't Work Well
- **MCP disconnects frequently** — especially after many sequential calls
- **Code components can't use external fonts easily** — Google Fonts `@import` inside a code component's `<style>` tag sometimes doesn't load
- **Template customization is tedious** — each text node, each image, each link needs its own `updateXmlForNode` call
- **Can't preview without publishing** — no way to see the result without user publishing and sharing screenshot
- **Framer template components look generic** — even with SABDA colors/content, the Asana template sections looked "basic"

### Framer Color Styles (already updated to SABDA)
```
/Main/BackGroundStronger = rgb(14,18,53)   — #0e1235
/Main/Background = rgb(20,24,64)           — slightly lighter navy
/Main/BackgroundRaised = rgb(24,28,72)     — card backgrounds
/Main/Primary = rgb(248,166,163)           — salmon
/Main/Secondary = rgba(248,166,163,0.1)    — salmon at 10%
/Main/Border = rgba(240,239,233,0.16)
/Text/Text = rgb(240,239,233)              — warm white
/Text/TextWeak = rgba(240,239,233,0.6)
/Text/TextStronger = rgb(14,18,53)
/Icons/Icon = rgb(240,239,233)
```

### Framer Code Components Created (from earlier sessions)
| Name | File ID | Status |
|------|---------|--------|
| SABDAComplete.tsx | cSR__TV | Old — full homepage React component |
| CymaticRings.tsx | Sp2bc5f | Working — animated rings |
| GradientFade.tsx | Omq9z3q | Working — gradient overlay |
| Testimonials.tsx | DxrP6bm | Working — carousel |
| TrustBar.tsx | wPIw0kT | Working — ClassPass/Google |
| PartnersMarquee.tsx | qSL6_TP | Working — scrolling logos |
| BookingSection.tsx | yi5BLFd | Working — pricing cards |
| SABDAFooter.tsx | E3UNTLB | Working — footer |
| SABDAFull.tsx | wzidpFE | Old attempt |
| SABDAPage.tsx | pVrN4B4 | Latest — full page code component (not yet on page) |

### Asana Template Components Still in Project
The Framer project still has the Asana yoga template's component library (Button, Badge, Accordion, FAQ, Plan Card, etc.). The desktop page (`WQLkyLRf1`) was cleared of most Asana sections but some may remain. The template components are still available if needed.

---

## 9. PENDING WORK

### Immediate (before next session)
- [ ] Marvyn to convert `EXP2.MOV` → `.mp4` and upload to accessible URL
- [ ] Marvyn to review v13 and provide specific feedback on animations, spacing, typography

### Next Session Priority
- [ ] Implement Marvyn's v13 feedback
- [ ] Refine class card animations per "world-class" direction (Marvyn wants something more arty, less basic)
- [ ] Swap hero video to EXP2.mp4 when available
- [ ] Mobile responsive pass (most traffic comes from Instagram ads on phones)
- [ ] Add mobile sticky booking bar (bottom of screen after scrolling past hero)

### Website Pages to Build
- [ ] `/classes/` — overview with all 7 class types
- [ ] `/pricing/` — full pricing with intro offers, packs, memberships
- [ ] `/the-space/` — technology showcase, gallery, specs
- [ ] `/rent-corporate/` — B2B page with inquiry form
- [ ] `/welcome/` — ads landing page (no nav, single CTA, conversion-focused)
- [ ] `/listening-sessions/` — sessions paused, signup for notifications
- [ ] `/about/` — origin story, mission, values, team
- [ ] `/contact/` — address, map, form

### Technical Integration
- [ ] Wire Meta Pixel (ID: `567636669734630`) — ViewContent, InitiateCheckout, Purchase events
- [ ] Fix GTM container
- [ ] Momence schedule widget embed (`host_id: 54278`)
- [ ] Corporate inquiry form → `connect@sabdastudio.com`
- [ ] EN/ES language toggle (URL structure: `/en/` and `/es/`)
- [ ] Google Maps embed with correct SABDA pin location

### Content Still Needed
- [ ] Juliet to write case studies (Apple, corporate events, etc.)
- [ ] Confirmed partner/press logos for marquee (currently placeholder names)
- [ ] Teacher profiles and photos
- [ ] Real testimonials with permission to use names
- [ ] Event/space gallery photos (high-res)

---

## 10. INTEGRATION REQUIREMENTS

### Momence
- **Host ID:** 54278
- **API Token:** a0314a80ca
- **Intro 3-Pack URL:** https://momence.com/m/443935
- **Single Class URL:** https://momence.com/m/443934
- **BCN Resident Week:** https://momence.com/m/443641
- **5-Pack:** https://momence.com/m/443937
- **10-Pack:** https://momence.com/m/443939
- **Monthly Membership:** https://momence.com/m/431216
- **3-Month Membership:** https://momence.com/m/445600
- **Listening Session:** https://momence.com/m/556050
- **Gift Card:** https://momence.com/gcc/54278
- **Schedule Widget Embed:**
```html
<div id="ribbon-schedule"></div>
<script async type="module" host_id="54278" locale="en"
  src="https://momence.com/plugin/host-schedule/host-schedule.js">
</script>
```

### Meta Pixel
- **Pixel ID:** 567636669734630
- **Events needed:** PageView, ViewContent, InitiateCheckout, AddToCart, Purchase (server-side via CAPI), Lead, Schedule, Search
- **Current status:** Checkout pixel broken (28 checkouts vs 161 purchases). Gloria is supposed to fix this.

### Aggregator Platforms
- ClassPass (€9.50/booking avg)
- Urban Sports Club
- Wellhub (Gympass)

### Analytics
- GA4 — needs proper configuration
- GTM — container needs fixing

---

## 11. KEY URLS & CREDENTIALS

| Item | URL/Value |
|------|-----------|
| Current website | https://sabda.es |
| New domain | sabdastudio.com (migration pending) |
| GitHub repo | https://github.com/marv0611/sabdawebsite |
| Framer project | https://individual-perspective-340178.framer.app/ |
| Momence host | https://momence.com/SABDA-54278 |
| Instagram | @sabda_studio |
| Address | C/Muntaner 83B, Local 2, 08011 Barcelona |
| Phone | +34 625 44 98 78 |
| General email | info@sabdastudio.com |
| Marketing email | marketing@sabdastudio.com |
| Sales email | connect@sabdastudio.com |
| Manager email | manager@sabdastudio.com |

### Company Details
- **Legal name:** SABDA STUDIO S.L.
- **C.I.F:** B44704401
- **IBAN:** ES20 2100 0801 1402 0120 3441
- **BIC:** CAIXESBBXXXCAIXA

---

## 12. FILE INDEX

### Key Files in This Repo

| File | Description |
|------|-------------|
| `SABDA_v13.html` | **Current working homepage build** — download and open locally |
| `SABDA_Website_Build_Manual.md` | This document |
| `SABDA_Brand_Foundations.pdf` | Brand strategy deck (colors, symbols, personas, positioning) |
| `SABDA_Website_Copy_v1.md` | Complete page-by-page website copy for all 9 pages |
| `SABDA_SEO_Competitive_Analysis_Prompt.md` | SEO analysis prompt (hasn't been run yet) |
| `SABDA_Notion_Full_Workspace_Extraction_March2026.md` | Full Notion workspace data dump |
| `SABDA_Notion_Marketing_Extraction_March2026.md` | Marketing-specific Notion data |
| `Meta_Ads_Chat_Summary_March_2026.md` | Complete Meta Ads analysis and action plan |

### Previous HTML Versions (for reference)
| Version | Key Feature | Status |
|---------|-------------|--------|
| v12 | All images from GitHub, brand navy, photo class cards, animated rings | Marvyn liked this one |
| v13 | v12 + animated symbol replacing blob, world-class card animations | Current working version |

---

## QUICK START FOR NEXT CHAT

Paste this at the beginning of your next chat:

> I'm continuing the SABDA website build. The project manual is at `SABDA_Website_Build_Manual.md` in the GitHub repo. Read it first. The current working file is `SABDA_v13.html`. Key context: we're building a pure HTML file (no frameworks, no templates) for an immersive wellness studio in Barcelona. The design is dark navy (#0e1235), with salmon (#F8A6A3) and cyan (#02F3C5) accents. PT Serif for headings, DM Sans for body. All images load from the GitHub repo. The founder (Marvyn) wants pixel-level custom code, world-class animations, and no template look. Last session we finished the homepage structure and are iterating on animation quality.

---

*End of manual. Created March 12, 2026.*
