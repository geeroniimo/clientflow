# ClientFlow

ClientFlow is a Framer plugin that lets designers collect structured client feedback directly inside Framer. This repo contains the server-side code that supports the plugin — handling Google OAuth, billing, and other operations that can't run inside the plugin sandbox.

---

## How it works

The plugin runs inside Framer as an iframe. Anything that requires a server — OAuth callbacks, payment sessions, webhooks — goes through this Next.js app deployed on Vercel.

### Google OAuth relay

Because the plugin lives in an iframe (and inside Electron when Framer is used as a desktop app), it can't receive OAuth redirects directly. The flow works like this:

1. The plugin generates a random `state` key and opens a Google OAuth popup via Supabase
2. Google redirects to `/auth/callback?state=<key>` on this server
3. The callback page extracts the tokens from the URL hash and calls `/api/relay-auth` to store them in Supabase against the `state` key
4. The plugin polls `/api/poll-auth` every 2 seconds until the tokens are available
5. The plugin calls `supabase.auth.setSession()` with the tokens to establish the session

### Billing

Subscriptions are handled via Polar. The server creates checkout and portal sessions for the plugin, and receives billing events via webhook.

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/auth/callback` | GET | Receives the Google OAuth redirect and relays session tokens to the plugin |
| `/api/relay-auth` | POST | Stores session tokens in Supabase against a state key |
| `/api/poll-auth` | POST | Plugin polls this to pick up tokens after OAuth completes |
| `/api/create-checkout` | POST | Creates a Polar checkout session |
| `/api/create-portal` | POST | Creates a Polar customer portal session |
| `/api/current-price` | GET | Returns the current subscription price |
| `/api/feedback-inject` | POST | Injects feedback data into the Framer canvas |
| `/api/screenshot` | POST | Captures screenshots for feedback annotations |
| `/api/polar-webhook` | POST | Processes Polar billing webhooks |

---

## Pages

| Route | Description |
|---|---|
| `/auth/callback` | OAuth callback UI — shown in the popup while tokens are being relayed |
| `/review/[token]` | Client-facing review page for viewing and submitting feedback |
| `/checkout/success` | Post-checkout confirmation page |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Auth:** Supabase (Google OAuth via token relay)
- **Database:** Supabase (PostgreSQL)
- **Billing:** Polar
- **Deployment:** Vercel
- **CORS:** Enabled for all `/api/*` routes via `middleware.ts`

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
POLAR_ACCESS_TOKEN=
POLAR_PRODUCT_ID=
POLAR_WEBHOOK_SECRET=
```
