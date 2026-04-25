# SABDA Post-Pivot Attribution: Structural Limit

**Status:** Permanent reality of the architecture. Not a bug. Not solvable in our code.
**Date documented:** 2026-04-25
**Author:** Marvyn Halfon
**Context:** Closes the KV-write-chain investigation (chats April 24-25 2026).

---

## TL;DR

After the Momence-direct pivot (commit `6d7d45b`, 2026-04-24), our Stripe-webhook-driven CAPI Purchase pipeline ships with **0% fbc** unless we re-enable Momence's own Conversions API as a parallel signal. The reason is structural, not a code bug: Momence's Stripe webhook payload contains zero attribution data, and the booking flow on our domain ends before any user identity is captured.

There is nothing to fix in our Worker, KV, or frontend code that closes this gap. Stop investigating. The only path to clean fbc on Purchase is **Option C**: Momence's CAPI token re-enabled in their admin (browser Pixel ID stays disabled).

---

## What we tested and why each option is dead

### Pre-pivot (working)
- Booking modal opened on `sabdastudio.com`
- User typed email → `curUser.email` populated
- `_sabdaStoreAttribution(email)` called → wrote `attr:${sha256(email)}` → KV
- Stripe webhook fires → `handleWebhookPurchase` reads `attr:${sha256(email)}` from KV → constructs fbc from stored fbclid → ships clean Purchase to CAPI
- Result: server-side Purchase EMQ ~7.3 with ~27% fbp coverage, fbc on attributed sales

### Post-pivot reality
- Custom modal never opens. Every Book click goes straight to Momence-hosted page.
- `curUser` never gets populated on our domain. Email is collected on `momence.com`, never touches our code.
- KV writes never fire (24h sample: 99 `[ATTR-WRITE-CALL]` events all `curUser=no email=no`, 0 `[ATTR-WRITE-FIRED]`).
- Stripe webhook fires, but payload contains: Momence-internal receipt fields only (`receiptCreditCardFee`, `receiptCustomerFee`, `receiptPriceWithoutVatAndFees`, `receiptVat`).
- Stripe webhook does NOT contain: `fbclid`, `fbp`, `client_reference_id`, `billing_email` (often null on Connect Apple Pay), or any field that links the sale to an ad click.

### Option A — Repair the dead KV chain
**Dead.** Requires email captured on our domain. Email is now captured on Momence's domain. We never see it until the Stripe webhook fires, by which point the user has left our cookies behind.

### Option B — Read fbclid from Stripe metadata via Momence passthrough
**Dead, verified by `/diag-stripe-meta` against the last 5 charges (2026-04-25):**

```
metadata_keys = [receiptCreditCardFee, receiptCustomerFee, receiptPriceWithoutVatAndFees, receiptVat]
client_reference_id = null
billing_email = null
```

Momence does not pass any URL query params (fbclid, utm_*, gclid) into the Stripe PaymentIntent metadata or `client_reference_id`. The URL-passthrough we shipped (`1768de1`) successfully gets fbclid into Momence's product page URL bar, but Momence's checkout submission to Stripe drops it.

To make Option B viable would require Momence to add fbclid passthrough on their platform. **This is a Momence platform conversation** (Marvyn → Nico, separate thread), not a code change we can make.

### Option C — Re-enable Momence's CAPI as parallel signal
**Only remaining path.** Mechanism:
1. Momence's CAPI token (NOT browser Pixel ID) re-entered in Momence admin → Settings → Social advertising tracking
2. Momence's backend posts server-side Purchase events to our Pixel ID (`567636669734630`) directly to Meta — independent of our Worker
3. Their CAPI events carry fbc constructed from URL fbclid (which we passed through via `1768de1`)
4. Our Stripe-webhook CAPI continues to fire `swh_ch_*` event_id Purchase events
5. Meta deduplicates by `(pixel_id + event_name + event_id)` — Momence and our event_ids differ, so Meta merges the two signal sources

### Gating questions for Nico (in flight 2026-04-25)
- (a) Does Momence's CAPI report GROSS or NET? — If NET, value mismatch with our GROSS Stripe-webhook signal kills Option C.
- (b) What event_id format does Momence use? — Must not collide with `swh_ch_*` prefix. Almost certainly safe given different format conventions.

If both green, Option C ships in 5 minutes (Marvyn re-enters token, no Worker change needed). If NET, we have no path and Purchase EMQ stays capped where it is until Momence platform-side fix.

---

## The structural cost

After the pivot, the booking flow looks like this:

```
User lands on sabdastudio.com with ?fbclid=X
  ↓
Browser fires capture beacon → KV (logged, not used for Purchase)
  ↓
Click "Book" → URL passthrough → momence.com/m/{id}?fbclid=X
  ↓
─────────── BOUNDARY OF OUR DOMAIN ──────────
  ↓
User fills checkout form on momence.com (email, card, etc.)
  ↓
Momence creates Stripe PaymentIntent (without any URL params)
  ↓
Stripe charge.succeeded → POST to our Worker /sabda-api/webhook/purchase
  ↓
Webhook payload contains: amount, billing_details (often null on Apple Pay),
  receipt_email (placeholder), Momence-internal receipt fields.
  Does NOT contain: fbclid, fbp, attribution.
  ↓
Worker fires CAPI Purchase with: em (real, via customer-expand), fn/ln/external_id
  /ip/ua/country (clean), fbp/fbc (none).
```

The boundary at "USER FILLS CHECKOUT FORM ON MOMENCE.COM" is the structural cost. We had a checkout form on our domain; we don't anymore. That form was where attribution-to-identity binding happened. Without it, the binding has to happen on Momence's side, and Momence doesn't currently bind it.

Our code is correct. The pivot is correct (it solved the modal-fragility problem and removed Apple Pay edge cases). The Purchase EMQ ceiling is now set by what Momence chooses to pass through. Two paths to lift it:
- **Short term:** Option C (Momence's CAPI re-enabled, dual signal)
- **Long term:** Momence platform conversation to add fbclid passthrough into Stripe metadata, which would let us close the loop in our Worker without any external dependency

---

## What's still live and useful

- **`ATTR-WRITE-CAPTURE-FIRED` beacon:** measures fbclid landing rate on `sabdastudio.com` (24h: 194 events, 97% with fbclid). Confirms ad clicks are reaching our pages. Useful as a top-of-funnel signal.
- **`ATTR-WRITE-READ-ATTEMPT` beacon:** measures user return rate (24h: 167 events, 48% match). Useful for understanding session re-entry behavior.
- **`[WEBHOOK-META]` diagnostic log (Worker `v159`+):** logs Momence's Stripe metadata on every real charge. Currently confirms the structural limit. Leave in place — it's the canary if Momence ever changes their integration.
- **`[CAPI] Purchase status: 200`** with em/fn/ln/external_id/ip/ua/country: the floor of our EMQ. Solid 100% coverage on the matchable fields we control.

## What's been removed (for clarity)

- `window._sabdaStoreAttribution` writer + 50 call sites + helper (commit `8e40250`, 2026-04-25). Was firing `[ATTR-WRITE-CALL]` beacons that could never write to KV.
- `/sabda-api/diag-stripe-meta` endpoint (Worker `v160` deployed 2026-04-25 09:56 UTC, removed in `v161` 10:00 UTC). Served its single purpose: confirming Option B is dead.

## Decision log

| Date | Decision | Outcome |
|---|---|---|
| 2026-04-24 12:35 UTC | Ship `1768de1` passthrough + IC-on-click | Reverted at 21:47 (script-tag bug) |
| 2026-04-24 21:49 UTC | Re-ship as `a06f018` (pure-JS injection, validator-protected) | Live, working |
| 2026-04-24 14:50 UTC | Disable Momence Pixel ID + CAPI token | Stopped Lead/VC pollution, dropped Purchase fbc to 0% |
| 2026-04-25 09:35 UTC | Strip dead `_sabdaStoreAttribution` (`8e40250`) | Logs cleaner, no functional change |
| 2026-04-25 09:50 UTC | Add `[WEBHOOK-META]` log (`v159`) | Permanent passive diagnostic |
| 2026-04-25 09:56 UTC | Add `/diag-stripe-meta` endpoint (`v160`) | Confirmed Option B dead |
| 2026-04-25 10:00 UTC | Remove `/diag-stripe-meta` endpoint (`v161`) | Cleanup done |
| 2026-04-25 (TBD) | Option C ship: Marvyn re-enables Momence CAPI token | Pending Nico's NET/GROSS confirmation |

## Files

- Worker source (live `v161`): managed via Cloudflare Workers API; deploy commands in `CLOUDFLARE_ACTIONS.md`
- Frontend module: injected at build via `/tmp/ship_passthrough_v2.py` (preserve this script — has the validator that prevented the v1 nested-script bug from ever recurring)
- Repo HEAD: `8e40250`
