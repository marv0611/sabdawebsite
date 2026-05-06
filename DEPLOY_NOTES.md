# SABDA Trial Modal — Deploy Notes

## Branch: modal-trial-v1
## Status: Approved, pending Day 2 dedup test + Marvyn go-live signal

---

## Deploy Steps

### 1. Worker (Cloudflare)
```bash
git checkout modal-trial-v1
npx wrangler deploy
```

### 2. Website (GitHub Pages)
```bash
git checkout main
git merge modal-trial-v1
git push origin main
# Wait 60s for deploy
```

### 3. Day 2 Dedup Test (NON-NEGOTIABLE)
- Place 3 real test purchases through the modal
- All 3 must show as single deduplicated events in Meta Events Manager
- Verify fbc is present on all 3
- Browser-to-CAPI timing must be < 5 minutes
- If any double-count: DO NOT go to A/B

---

## What Ships

- `modal-trial.js` — external checkout modal for Trial Class (443934, €18)
- Script tag on 25 pages with Trial links
- Cookie `sabda_checkout_variant` sets ONLY on /intro/ pages
- Worker fixes: isGuestOnlyBooking, 3DS auto-enroll via KV, /auto-enroll endpoint
- Worker fix: country='es' hardcode dropped (empty string, let Meta infer from IP)

## What Does NOT Ship

- 3-Pack (443935) — separate decision after A/B read
- Individual class session bookings — stays on Momence
- Memberships, drop-ins, ice bath — all stay on Momence

---

## v2 Considerations

- **Phone number field:** Not collected in v1 Trial modal. Phone is a strong
  match signal for Meta EMQ. If modal EMQ comes in below 8, add phone as
  an optional field in v2 (country code selector + number input, same pattern
  as the existing schedule page modal).

- **3-Pack expansion:** If Trial A/B wins, expand modal to intercept 443935
  links. Requires adding product picker to the modal UI.

---

## Revert Procedure (any team member can execute)

1. Delete `modal-trial.js` from repo root
2. `git add -A && git commit -m "revert: remove trial modal" && git push origin main`
3. Wait 60 seconds
4. All traffic reverts to Momence
5. No Worker changes needed (Worker endpoints sit idle)
6. No ads changes needed (same URLs, same Pixel)
7. Total time: ~15 minutes

---

## A/B Test

- 50/50 cookie split, 30-day expiry
- Cookie sets only on /intro/ (ad landing page traffic)
- Decision date: ~30 days post-launch
- Kill criteria: modal loses on conversion rate (regardless of EMQ improvement)
- Win criteria: modal ties/wins on conversion AND improves fbc match rate
- Sunset clause: if underperforms or breaks something, revert without debate
