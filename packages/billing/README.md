# @levelup/billing

Stripe SDK wrapper for LevelUp AI Academy. Handles checkout session creation, customer management, webhook verification, and plan resolution.

## Stub mode

When `STRIPE_SECRET_KEY` is empty or starts with `PLACEHOLDER_`, the package runs in **stub mode**:

- `createCheckoutSession` returns a fake URL pointing to `/billing/stub-success`
- `createBillingPortalSession` returns `/billing/stub-portal`
- `ensureCustomer` returns `cus_stub_<orgId>` without calling Stripe
- `verifyWebhook` throws — webhooks are not available in stub mode
- A console warning is printed once at startup

Stub mode is blocked in `NODE_ENV=production` — a runtime error is thrown at module load.

## Pricing tiers

| Plan       | Env var                   | Seats  |
| ---------- | ------------------------- | ------ |
| STARTER    | `STRIPE_PRICE_STARTER`    | 50     |
| GROWTH     | `STRIPE_PRICE_GROWTH`     | 250    |
| ENTERPRISE | `STRIPE_PRICE_ENTERPRISE` | 5000\* |

\*ENTERPRISE seat cap defaults to 5000; the API layer may override this per-org.

## Environment variables

| Variable                  | Required     | Description                                 |
| ------------------------- | ------------ | ------------------------------------------- |
| `STRIPE_SECRET_KEY`       | Yes          | Stripe secret key (or `PLACEHOLDER_*`)      |
| `STRIPE_WEBHOOK_SECRET`   | For webhooks | Stripe webhook signing secret               |
| `STRIPE_PRICE_STARTER`    | Real mode    | Stripe price ID for STARTER plan            |
| `STRIPE_PRICE_GROWTH`     | Real mode    | Stripe price ID for GROWTH plan             |
| `STRIPE_PRICE_ENTERPRISE` | Real mode    | Stripe price ID for ENTERPRISE plan         |
| `NEXT_PUBLIC_APP_URL`     | No           | Base URL (default: `http://localhost:3000`) |

## Stripe API version

`2024-09-30.acacia`
