# SABDA Worker Environment Variables

**Worker:** `sabda-checkout-proxy` (sabda-checkout-proxy.sabda.workers.dev)  
**Last updated:** May 4, 2026  
**Current version:** v165 (id `141e2377-0db3`, deployed 2026-05-01)

> This replaces `WORKER_FIX_NOTES.md` as the canonical Worker reference.

---

## Secrets (encrypted, values not in repo)

| Name | Type | Used in | Purpose | Where to regenerate | Owner |
|---|---|---|---|---|---|
| `CAPI_ACCESS_TOKEN` | secret | `sendCAPIEvent()` | Meta Conversions API access token for server-side Purchase events | Meta Business Suite > Events Manager > Settings > Conversions API | Marv / Gloria |
| `Claude` | secret | `classifyWithClaude()` | Anthropic API key for AI classification of contact form submissions | console.anthropic.com > API Keys | Marv |
| `Notion` | secret | `logToNotion()` | Notion integration token for logging sales-relevant form submissions | notion.so/my-integrations | Marv |
| `NOTION_DATABASE_ID` | secret | `logToNotion()` | Notion FIRST CONTACT database ID (`319494b4-4f1a-8062-a0e9-de7317bdee7c`) | Notion dashboard > FIRST CONTACT database > Share > Copy link > extract ID | Marv |
| `Resend` | secret | `sendEmailViaResend()` | Resend API key for transactional email delivery (contact form routing) | resend.com/api-keys | Marv |
| `STRIPE_API_KEY` | secret | Stripe webhook verification, future direct charges | Stripe secret key (`sk_live_...`) | Stripe dashboard > Developers > API keys | Marv |
| `STRIPE_WEBHOOK_SECRET` | secret | Stripe webhook signature verification | Stripe webhook signing secret (`whsec_...`) | Stripe dashboard > Developers > Webhooks > signing secret | Marv |

## KV Namespace Bindings

| Name | Type | Namespace ID | Purpose |
|---|---|---|---|
| `ATTRIBUTION_KV` | kv_namespace | `f9930d6ddecd463994f3ef6b20b0b2e1` | Stores attribution data (fbclid, UTM params) keyed by session, used for CAPI dedup and future alert rate-limiting |

## Hardcoded Constants (in Worker source, not env)

| Name | Value | Used in | Purpose |
|---|---|---|---|
| `STRIPE_ACCOUNT_ID` | `38966` | `handlePay` | Momence's internal numeric ID for SABDA's Stripe connected account. NOT the Stripe acct string `acct_1RUWnoBf6nsynAht`. |
| `MOMENCE` | `https://momence.com` | All handlers | Momence API base URL |
| `hostId` | `54278` | All Momence API calls | SABDA's Momence host ID |
| `token` | `a0314a80ca` | Momence readonly API | Momence readonly API token |
| `PIXEL_ID` | `567636669734630` | `sendCAPIEvent()` | Meta Pixel ID |
| `homeLocationId` | `49623` | `handlePay` | SABDA's Momence location ID |

## Duplicate/Legacy Bindings (safe to remove)

These uppercase duplicates exist in the CF dashboard but are NOT referenced in Worker code (which uses lowercase):

| Name | Status | Action |
|---|---|---|
| `CLAUDE` | Duplicate of `Claude` | Safe to remove |
| `NOTION` | Duplicate of `Notion` | Safe to remove |
| `RESEND` | Duplicate of `Resend` | Safe to remove |

## Worker Endpoints

| Path | Method | Purpose | Auth required |
|---|---|---|---|
| `/health` | GET | Health check | No |
| `/login` | POST | Momence login proxy | No |
| `/mfa-verify` | POST | MFA code verification | Session cookie |
| `/book` | POST | Class booking (with credits) | Session cookie |
| `/pay` | POST | Stripe payment via Momence | No (creates account) |
| `/promo` | POST | Promo code validation | No |
| `/check-email` | POST | Customer lookup | No |
| `/capi-status` | GET | CAPI debug info | No |
| `/sabda-api/diag` | POST | Diagnostic logging from booking pages | No |
| `/sabda-api/contact` | POST | Contact form > email + Notion | No |

## Deployment

```bash
# Fetch current source
curl -sS "https://api.cloudflare.com/client/v4/accounts/ac63756828d402343fc988ec9f161f56/workers/services/sabda-checkout-proxy/content" \
  -H "Authorization: Bearer $CF_TOKEN" > /tmp/worker_current.js

# Deploy (auto-activates, no draft)
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/ac63756828d402343fc988ec9f161f56/workers/scripts/sabda-checkout-proxy" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -F 'metadata={"main_module":"worker.js","compatibility_date":"2024-01-01"};type=application/json' \
  -F 'worker.js=@/tmp/worker_current.js;type=application/javascript+module;filename="worker.js"'
```

Worker deploys are INDEPENDENT from GitHub Pages. Pushing to the repo does NOT deploy the Worker.
