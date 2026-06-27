# 🚀 Launch Checklist — Really Simple Membership
*Custom Domain Go-Live Guide*

---

## Phase 1 — Domain & DNS

- [ ] Purchase or transfer your custom domain (e.g. `reallysimplemembership.com`)
- [ ] In your DNS provider, point the domain to Vercel:
  - Add a **CNAME** record: `www` → `cname.vercel-dns.com`
  - Add an **A** record: `@` → `76.76.21.21` (Vercel's IP for apex domains)
- [ ] In Vercel → Project → **Settings → Domains**, add your custom domain
- [ ] Verify SSL certificate is issued (Vercel auto-provisions Let's Encrypt — usually < 2 min)
- [ ] Test that `https://yourdomain.com` and `https://www.yourdomain.com` both resolve

---

## Phase 2 — Vercel Environment Variables

Go to **Vercel → Project → Settings → Environment Variables** and set/update all of the following:

### 🔐 Authentication (Clerk)
- [ ] `VITE_CLERK_PUBLISHABLE_KEY` — Switch from `pk_test_...` to your **production** `pk_live_...` key
- [ ] `CLERK_SECRET_KEY` — Switch from `sk_test_...` to your **production** `sk_live_...` key
- [ ] `SUPERUSER_EMAIL` — Set to your email address (removes the hardcoded fallback)
- [ ] `CLERK_BYPASS_AUTH` — Confirm this is `false` or not set in production

### 🌐 App Domain (Critical — affects CORS & OG images)
- [ ] `VITE_APP_URL` = `https://yourdomain.com`
  > **Why:** Used by the Google Wallet CORS headers. Without it the app falls back to `reallysimple-membership.vercel.app`

### 🔒 Cron Security
- [ ] `CRON_SECRET` = `31fb1be23adefb3e557f1de7dcb9bd4206cee4c1e3a0fc3f648825b90f37f842`

### 🗄️ Database
- [ ] `DATABASE_URL` — Confirm your Neon production connection string is set

### ☁️ Storage (Cloudflare R2)
- [ ] `R2_ACCOUNT_ID`
- [ ] `R2_ACCESS_KEY_ID`
- [ ] `R2_SECRET_ACCESS_KEY`
- [ ] `R2_BUCKET_NAME`
- [ ] `R2_CUSTOM_DOMAIN` — Set to your R2 public custom domain (e.g. `https://assets.yourdomain.com`)

### 💳 Stripe (switch to live keys)
- [ ] `STRIPE_SECRET_KEY` — Switch from `sk_test_...` to `sk_live_...`
- [ ] `STRIPE_WEBHOOK_SECRET` — Create a **new live webhook** in Stripe pointing to `https://yourdomain.com/api/webhooks/stripe`
- [ ] `VITE_STRIPE_PRICE_PRO_MONTHLY` — Live price ID
- [ ] `VITE_STRIPE_PRICE_PRO_YEARLY` — Live price ID
- [ ] `VITE_STRIPE_PRICE_PLUS_MONTHLY` — Live price ID
- [ ] `VITE_STRIPE_PRICE_PLUS_YEARLY` — Live price ID
- [ ] `VITE_STRIPE_PRICE_BUSINESS_MONTHLY` — Live price ID

### 🍎 Apple Wallet
- [ ] `APPLE_TEAM_ID`
- [ ] `APPLE_PASS_TYPE_ID`
- [ ] `WALLET_WWDR_CERT`
- [ ] `WALLET_SIGNER_CERT`
- [ ] `WALLET_SIGNER_KEY`
- [ ] `WALLET_SIGNER_PASSPHRASE`
- [ ] `APPLE_APNS_AUTH_KEY`
- [ ] `APPLE_APNS_KEY_ID`

### 🤖 Google Wallet
- [ ] `GOOGLE_WALLET_ISSUER_ID`
- [ ] `GOOGLE_WALLET_CLIENT_EMAIL`
- [ ] `GOOGLE_WALLET_PRIVATE_KEY`

---

## Phase 3 — Clerk Production Setup

- [ ] In Clerk dashboard → **Settings → Domains**, add your custom domain
- [ ] Switch the Clerk instance from **Development** to **Production** mode
- [ ] Update **Allowed Origins** in Clerk to include `https://yourdomain.com`
- [ ] Configure your **Email From** address in Clerk (e.g. `noreply@yourdomain.com`)
- [ ] Verify your account has `publicMetadata: { role: "super_admin" }` set in Clerk, or that `SUPERUSER_EMAIL` matches your login email

---

## Phase 4 — Stripe Production Setup

- [ ] In Stripe → **Developers → Webhooks**, create a new endpoint:
  - URL: `https://yourdomain.com/api/webhooks/stripe`
  - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.upcoming`, `invoice.payment_failed`
- [ ] Copy the new **Signing Secret** (`whsec_...`) into Vercel as `STRIPE_WEBHOOK_SECRET`
- [ ] Run a Stripe test payment to confirm webhook delivery before going live

---

## Phase 5 — Apple Wallet — Update Pass Web Service URL

- [ ] Verify the `webServiceURL` in pass generation points to `https://yourdomain.com/api/v1`
- [ ] Confirm your **Pass Type ID** is associated with the correct domain in Apple Developer portal
- [ ] Issue a test pass and add to Apple Wallet — verify device registers correctly

---

## Phase 6 — Email Sender Domain

The app currently sends from `{slug}@reallysimpleapps.com` and `billing@reallysimpleapps.com`. To use your own domain:

- [ ] Add your domain to your email provider (Resend/SendGrid) and configure DNS records
- [ ] Update sender addresses in:
  - `api/_utils/membership_emails.ts` — welcome & expiry emails
  - `api/_utils/billing_emails.ts` — billing emails
- [ ] Send a test email and verify it doesn't land in spam

---

## Phase 7 — Hardcoded Domain References to Update

These files contain `reallysimpleapps.com` that should be updated to your live domain:

| File | What to update |
|---|---|
| `api/public.ts` L109, L178, L198 | Fallback host & OG image branding footer |
| `api/passes.ts` L933 | "Powered by" attribution link in Google Wallet passes |
| `src/components/PolicyPage.tsx` L28, L105 | Contact email in Privacy Policy |
| `src/components/membership/admin/MembershipAdminLayout.tsx` L167 | Support email in sidebar footer |
| `src/types.ts` L125–126 | Default card template contact links |

---

## Phase 8 — Redeploy & Smoke Test

- [ ] Trigger a fresh Vercel deployment after all env vars are updated
- [ ] Confirm deployment completes with zero build errors

### Auth
- [ ] Sign in on the live domain — confirm redirect works
- [ ] `/admin` loads for super user
- [ ] `/admin/security` is blocked for a standard admin (redirects to `/admin/no-access`)

### Membership
- [ ] Create a test club
- [ ] Issue a test membership card
- [ ] Public member page loads at `https://yourdomain.com/m/{slug}`

### Wallets
- [ ] Apple Wallet pass downloads from live domain
- [ ] Google Wallet "Save to Google Pay" button works

### Stripe
- [ ] Complete a test checkout
- [ ] Webhook received (200) in Stripe dashboard
- [ ] User tier updated in database

### Cron
- [ ] `GET https://yourdomain.com/api/cron/expiry-alerts` without auth → `401 Unauthorized`
- [ ] Same endpoint with `Authorization: Bearer {CRON_SECRET}` → `200 OK`

---

## Phase 9 — Post-Launch Monitoring

- [ ] Check Vercel Functions logs for any 500 errors in first 24h
- [ ] Confirm `api_logs` table in Neon is growing (logging is working)
- [ ] Confirm cron job shows in Vercel → Cron tab scheduled at `0 10 * * *`
- [ ] Set up uptime monitor on `https://yourdomain.com/api/public?resource=status`

---

## Quick Reference — New Env Vars Added This Session

| Variable | Value | Purpose |
|---|---|---|
| `VITE_APP_URL` | `https://yourdomain.com` | CORS on pass endpoints |
| `CRON_SECRET` | `31fb1be23...f842` | Cron auth guard |
| `SUPERUSER_EMAIL` | `your@email.com` | Superuser detection fallback |
