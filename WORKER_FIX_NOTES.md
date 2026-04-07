# SABDA Worker — Payment Endpoint Fix Notes
**Date:** April 7, 2026
**Status:** Critical bug — needs Worker rewrite before launch

## The Problem

The Cloudflare Worker at `sabda-checkout-proxy.sabda.workers.dev` cannot process real Stripe payments. Calling `/sabda-api/pay` with any payload returns:

```json
{
  "error": "At path: stripeConnectedAccountId -- Expected whole positive number, got 'acct_1RUWnoBf6nsynAht'",
  "data": { "field": "stripeConnectedAccountId", "value": "acct_1RUWnoBf6nsynAht" }
}
```

This affects **both desktop and mobile** — they use the same Worker. Real payments have never been tested end-to-end through this Worker.

## Root cause

`handlePay()` in `cloudflare-worker-checkout-proxy.js` (line 765) does:

```js
const stripeAcct = session.stripeConnectedAccount || '';  // line 728
// ...
if (stripeAcct) body.stripeConnectedAccountId = stripeAcct;  // line 765
```

Two bugs:
1. Reads `session.stripeConnectedAccount` (a STRING like `acct_1RUWnoBf6nsynAht`) and forwards it as `stripeConnectedAccountId` (which Momence expects as a NUMBER like `38966`).
2. The endpoint `POST /_api/primary/plugin/sessions/:id/pay` is the WRONG endpoint entirely — it's for free bookings only. It rejects `stripePaymentMethodId` and `boughtMembershipIds` as `never` types.

## What Momence's real checkout actually does

I extracted Momence's own checkout JS bundle from `https://static.momence.com/checkout-pages/static/js/main.2f6b000b.js` and reverse-engineered the real flow:

### Step 1: Recalculate cart
```
POST https://momence.com/_api/primary/checkout/cart/recalculate
Content-Type: application/json
Headers: x-session-v2: <generated session key>

{
  "hostId": 54278,
  "items": [
    {
      "type": "membership",  // or "appointment-attendee" for class booking
      "membershipId": 443935,  // for membership/pack purchases
      "quantity": 1,
      "guid": "<client-generated UUID>"
    }
  ]
}
```

**Response:**
```json
{
  "items": [{ "type": "membership", "guid": "...", "membershipId": 443935, "finalPriceInCurrencyTotals": {...}, "discountedPriceInCurrencyTotals": {...} }],
  "totalInCurrency": { "includingVat": "50", "excludingVat": "41.32", "vatAmount": "8.68", "price": "50" },
  "signature": "c925ce3d0ef9956872d9b456aa347ba6a28ff426bb9c71d078da941896612af7",
  "stripeConnectedAccountToUse": {
    "id": 38966,                              // ← THE NUMERIC ID
    "externalId": "acct_1RUWnoBf6nsynAht",   // ← what the Worker is wrongly using
    "countryCode": "ES"
  }
}
```

### Step 2: Pay the cart
```
POST https://momence.com/_api/primary/checkout/cart/pay
Content-Type: application/json
Headers: x-session-v2: <generated session key>

{
  "hostId": 54278,
  "items": [...],                              // from step 1 response
  "signature": "c925ce3d...",                  // from step 1 response
  "tickets": [{ "firstName": "...", "lastName": "...", "email": "...", "isAdditionalTicket": false }],
  "stripeConnectedAccountId": 38966,           // numeric ID from step 1
  "stripePaymentMethodId": "pm_...",           // from Stripe.js
  "isEmailSent": true,
  // ... possibly more required fields
}
```

## Valid `items[].type` values
From Momence's API error message:
- `appointment-attendee` (for class bookings)
- `appointment-deposit`
- `appointment-new-attendee-new-reservation`
- `appointment-new-attendee-deposit-new-reservation`
- `appointment-new-reservation`
- `video`
- `course`
- `product`
- `gift-card`
- `custom-gift-card`
- `membership` ← used for packs (3-pack, 5-pack, 10-pack) and memberships (Flex/Ritual/Immerse)
- `membership-joining-fee`

## Other Momence checkout endpoints discovered
- `POST /_api/primary/checkout/cart/recalculate` — get signature + price + account ID
- `POST /_api/primary/checkout/cart/pay` — pay
- `POST /_api/primary/checkout/cart/book` — book without payment (for credits)
- `POST /_api/primary/checkout/cart/verify-gift-card` — gift card validation
- `POST /_api/primary/checkout/cart/compatible-memberships` — check what memberships work with this item
- `POST /_api/primary/checkout/customer/alert` — email existence check (already used correctly by handleCheckEmail)

## What the Worker rewrite needs

### `handlePay` must be rewritten to:
1. Build `items` array with `guid: crypto.randomUUID()` based on input (`type`, `productId`, `sessionId`)
2. POST to `/checkout/cart/recalculate` to get `signature` + numeric `stripeConnectedAccountId`
3. POST to `/checkout/cart/pay` with the signature, items, tickets, and Stripe payment method
4. Handle the response — including 3D Secure (`clientSecret` field)
5. Match the response shape that mobile/desktop JS expects: `{success: true, data: {...}}` or `{clientSecret: '...'}`

### Likely gotchas:
- The `x-session-v2` header is required by Momence (set from `window.APP_SESSION_KEY` in their JS, generated client-side via obfuscated code)
- The `isEmailSent` field is required (boolean)
- More required fields probably exist — discover by capturing a real Momence checkout in browser DevTools
- The error response from `/checkout/cart/pay` is different from `/sessions/:id/pay`

### What works correctly already (don't touch):
- `handleCheckEmail` → uses `/checkout/customer/alert` correctly
- `handleLogin` → uses `/auth/login` correctly  
- `handleMfaVerify` → works
- `handlePromo` → works
- `handleBook` → uses `/membership-pay` for credits-based bookings, may also need review

## Recommended rewrite approach

1. **Capture real traffic first.** Open `momence.com/m/443935` on your phone in mobile Safari. Open Safari Web Inspector → Network tab. Complete a real payment with a real card. Export the HAR file. This gives you the EXACT payload, headers, and sequence that Momence's own checkout uses.

2. **Use `wrangler dev` for fast iteration.** Run the Worker locally so test cycles are <5 seconds against the real Momence API.

3. **Don't try to fix this blind.** Without a real captured request, you'll guess at field names and waste hours.

4. **Test incrementally.** Get class booking working first (no productId), then membership purchase, then class + membership combo.

## Current state of the mobile site (April 7, 2026)

After this audit, the following changes were made to keep the site functional:
- All package purchase buttons reverted to direct `momence.com/m/PRODUCTID` links (opens Momence's hosted checkout in new tab)
- The native booking modal in `m/schedule.html` still exists but **the `/pay` flow within it is broken** until the Worker is fixed
- Free booking flow (using credits via `/book` → `/membership-pay`) may still work — needs testing
- Header "Book a Class" pills → `m/schedule.html` (browse classes, native UI)
- Removed `openPackagePurchase()` and related code from schedule.html (it called the broken endpoint)

## Files to fix
- `cloudflare-worker-checkout-proxy.js` — Worker source (lines 700-803, the `handlePay` function)
- After deploying Worker fix, the mobile/desktop JS should work as-is — no client changes needed

## Deployment
After fixing the Worker source:
```bash
# Either via Cloudflare dashboard (paste new code into the Worker editor)
# Or via wrangler if account is set up:
wrangler deploy cloudflare-worker-checkout-proxy.js
```

The Cloudflare API token in project memory (`cfut_qceLUS3lhp88g4ioHNN04xCdxfiIvRXlbVFmxZXF13c7107e`) was flagged as exposed and needs regeneration before any CLI deployment.
