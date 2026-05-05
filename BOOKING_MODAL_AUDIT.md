# Booking Modal Error State Audit

**Date:** May 4, 2026  
**Files audited:** `m/schedule.html` (mobile), `classes.html` + `classes/index.html` (desktop), ES/CA equivalents  
**Method:** Static code analysis of all `fetch()` calls, `.catch()` blocks, timeout handling, and user-visible error paths

---

## Summary

The booking modal has **solid error handling on critical payment paths** (AbortController timeouts, safety timers, Stripe error pass-through) but **gaps in network detection and retry UX**. No catastrophic "blank screen" failures found. The most common failure mode is a generic "Connection error" message with no retry button.

---

## Test Matrix

### Desktop (`classes.html`, `classes/index.html`)

| # | Scenario | Error handling | User sees | Verdict |
|---|---|---|---|---|
| 1 | Worker `/pay` returns 500 | `.catch()` fires, `showFallback()` called | "Payment failed. Please try again." + Momence fallback link | ✅ Working |
| 2 | Worker `/pay` returns 4xx (validation) | `r.data.error` displayed | Specific error message from Worker (e.g. "No such PaymentMethod") | ✅ Working |
| 3 | Worker `/pay` times out | 25s AbortController on Apple/Google Pay path | "Payment timed out. Please try again." | ✅ Working |
| 4 | Worker `/login` malformed response | Guard checks `!d \|\| !d.user`, calls `showFallback()` | "Login response malformed. Please try again." + Momence link | ✅ Working |
| 5 | Stripe card declined | Stripe error message passed through `conf.error.message` | Stripe's decline reason (e.g. "Your card was declined") | ✅ Working |
| 6 | Network offline | No `navigator.onLine` check, no offline detection | Generic "Connection error (Failed to fetch)." after full timeout | ⚠️ Degraded |

### Mobile (`m/schedule.html`)

| # | Scenario | Error handling | User sees | Verdict |
|---|---|---|---|---|
| 1 | Worker `/pay` returns 500 (card flow) | `.catch()` fires | "Connection error" + error message | ✅ Working |
| 2 | Worker `/pay` returns 4xx | `r.data.error` displayed | Specific error message | ✅ Working |
| 3 | Worker `/pay` timeout (Apple/Google Pay) | 25s AbortController | "Payment timed out. Please try again." | ✅ Working |
| 4 | Worker `/pay` timeout (card flow) | 20s safety timer resets button | "Taking too long. Please try again." after 20s; 6s progress text "Almost done..." | ✅ Working |
| 5 | Stripe 3DS failure | `conf.error.message` displayed | Authentication failure message | ✅ Working |
| 6 | Free booking (100% promo) failure | `.catch()` fires, button resets | "Booking failed." + fallback link | ✅ Working |
| 7 | Network offline | No detection | Generic fetch error after timeout | ⚠️ Degraded |
| 8 | `/check-email` fails | catch logs error, flow continues | Login step skipped, proceeds as guest | ✅ Working (graceful) |

---

## Identified Gaps (prioritized)

### Priority 1 (should fix)

| Gap | Current behavior | Desired behavior | Complexity | Files |
|---|---|---|---|---|
| No offline detection | User waits full timeout (20-25s) before seeing error | Immediate "You appear to be offline" message on fetch failure when `!navigator.onLine` | S | 7 booking files |
| No retry button after payment error | User must close modal and start over | "Try again" button that re-submits with same data (card element stays mounted) | M | 7 booking files |

### Priority 2 (nice to have)

| Gap | Current behavior | Desired behavior | Complexity | Files |
|---|---|---|---|---|
| No progress feedback on card payment | Button says "Processing..." for up to 20s | Stepped progress: "Verifying card..." (2s) > "Processing payment..." (5s) > "Almost done..." (10s) | S | 7 booking files |
| Password field errors not specific | "Password must be at least 8 characters" | Add: uppercase, number, special char requirements matching Momence's actual rules | S | 7 booking files |
| Generic "Connection error" message | Shows `e.message` which is often "Failed to fetch" | Map to user-friendly messages: timeout > "Taking too long", TypeError > "Something went wrong", etc. | S | 7 booking files |

### Priority 3 (low impact)

| Gap | Current behavior | Desired behavior | Complexity | Files |
|---|---|---|---|---|
| No Momence API health pre-check | If Momence is fully down, user discovers only after entering all details | Soft health check on modal open; if Momence unreachable, show "Booking temporarily unavailable" with Momence direct link | M | 7 booking files |
| Safety timer fires silently | After 20s, button just resets to "Confirm booking" | Log to `/sabda-api/diag` so we can track timeout frequency | S | 7 booking files |

---

## What's working well

- **Every `.catch()` block captures the error parameter and logs it** (enforced by `audit.sh` [BARE_CATCH] blocker since April 12)
- **Momence fallback link** (`showFallback()`) appears on all critical failures, giving users an escape hatch
- **3DS handling** implemented with proper error display
- **AbortController timeout** (25s) on Apple/Google Pay prevents infinite hangs
- **Safety timer** (20s) on card flow prevents stuck "Processing..." state
- **No duplicate function declarations** (enforced by audit.sh)
- **All pixel helpers wrapped in try/catch** so tracking never breaks the critical path

---

## Recommendation

Fix Priority 1 items (offline detection + retry button) in a single session. These are the only gaps that materially affect user experience. Priority 2-3 are polish. Don't fix anything until Marv confirms priorities.
