# 📋 PROJECT STATUS — Really Simple Apps (reallysimple-membership)

| Date | Head Commit |
| --- | --- |
| 2026-06-11 (Session 22) | `main` |

> Repo: <https://github.com/davidyoungrs/reallysimple-membership>
> Local Dev: `npm run dev -- --port 5173`
> Live URL: Deployed via Vercel on `main` branch

---

## 🟢 CURRENT STATE — Where We Are Right Now

The platform is now in a **Production-Ready & Fully Verified** state. We have completed the following key tasks:

1. **Production Clerk Authentication**: Switched from Mock Clerk to real Clerk in production. Corrected sign-out / back button loops on the unauthorized screen so users are not trapped.
2. **Apple Wallet Pass Generation**: Fixed Vercel `500` serverless bundle failures by co-locating certificate assets (`wwdr.pem`, `signerCert.pem`, etc.) inside the `api/certs/` folder, statically referencing them using static literals with `__dirname` for Vercel NFT trace compatibility. Fixed ASN.1 parsing crashes.
3. **APNs Push Notifications**: Resolved JWT token signature errors by committing a static `certs/apns.p8` private key file. Cleaned up and stripped potential enclosing quotes from `APPLE_APNS_KEY_ID` and `APPLE_TEAM_ID` environment variables. verified that Wallet updates deliver successfully to devices.

---

## ✅ COMPLETED WORK

### Clerk Production Auth & Wallet Updates (Session 22)

- [x] **Real Clerk Auth Toggle**: Deployed Clerk production settings and conditional mocked clerk resolution for offline development.
- [x] **Apple Wallet Pass Generation 500 Fix**: Relocated certificates to `api/certs` and resolved Vercel serverless bundling static reference path issues.
- [x] **APNs Push Update Fix**: Created static `apns.p8` private key file configuration and sanitized environmental keys from quote wrappers, successfully enabling push notifications.

### Local Dev & Database Stability (Session 21)

- [x] **Clerk Mock Stable Reference**: Fixed infinite request rendering loops on admin pages by memoizing `getToken` in [MockClerk.tsx](file:///Volumes/Untitled/contact-tree-membership/src/components/MockClerk.tsx).
- [x] **Neon DB Transaction Support**: Switched to `@neondatabase/serverless`'s `Pool` in [index.ts](file:///Volumes/Untitled/contact-tree-membership/src/db/index.ts) to enable transaction block execution (`db.transaction`).
- [x] **CSP Configuration**: Opened up Content Security Policy in [index.html](file:///Volumes/Untitled/contact-tree-membership/index.html) to allow Cloudflare R2 uploads and Unsplash image rendering.
- [x] **Rate Limit Bypass for Dev**: Enabled automatic bypass for security rate limits under development environment (`NODE_ENV === 'development'`) in [security.ts](file:///Volumes/Untitled/contact-tree-membership/api/_utils/security.ts).
- [x] **Sidebar Route Fix**: Updated route path in [AdminSidebar.tsx](file:///Volumes/Untitled/contact-tree-membership/src/components/admin/AdminSidebar.tsx) to map `/admin` directly without redirect lag.
- [x] **Server-Side Upload Proxy**: Added `/api/membership?action=upload` proxy to upload files (such as member avatars and generated card strips) to R2 directly from the backend to circumvent client-side CORS Preflight (403) limitations.
- [x] **Club Logo Drag & Drop Zone**: Created a premium drag-and-drop file uploader zone with optional URL text input toggle in [AdminMembershipClubs.tsx](file:///Volumes/Untitled/contact-tree-membership/src/components/admin/AdminMembershipClubs.tsx) for easy club logo branding setups.

### Privacy & Build Stability (Session 20)

- [x] **Frontend Policy Sync**: Updated [PolicyPage.tsx](file:///Users/davidyoung/contact-tree/src/components/PolicyPage.tsx) with the updated Privacy Policy text (effective June 7, 2026), replacing the hardcoded outdated policy sections.
- [x] **Dynamic Contact Info**: Introduced dynamic email matching based on the active policy type, showing `info@reallysimpleapps.com` for Privacy and `support@reallysimple.apps` for Terms and Cookies.
- [x] **Rich Text Support**: Added support for React JSX structure inside the policy sections to render list items instead of relying entirely on simple strings.
- [x] **Deployment Peer Dependency Fix**: Created a root [.npmrc](file:///Users/davidyoung/contact-tree/.npmrc) file configuring `legacy-peer-deps=true` to resolve the Vite 8 vs Tailwind peer dependency conflict on Vercel builds.

### API Security Hardening (Session 20)

- [x] **Security Middleware**: Implemented rate-limiting and request payload validation in `api/_utils/security.ts`.
- [x] **Endpoint Integration**: Integrated security checks into all key backend API entry points:
  - User onboarding and management (`api/user.ts`)
  - Billing and billing actions (`api/billing.ts`)
  - Apple Wallet pass generation (`api/passes.ts`)
  - Cards endpoint (`api/cards.ts`)
  - Leads collection (`api/leads.ts`)
  - Public routes (`api/public.ts`)
  - Webhook receivers (`api/apple-webhook.ts`, `api/webhooks/stripe.ts`)
  - Contact and Admin pages (`api/contact.ts`, `api/admin/index.ts`)

### Growth & SEO (Session 19)

- [x] **Dynamic OpenGraph Images**: Integrated `@vercel/og` to generate on-the-fly preview images (1200x630) for each public card based on the user's selected theme and avatar.
- [x] **Meta Tag Injection**: Added serverless logic to intercept `/card/:slug` requests and inject `<meta>` tags (og:image, og:title, twitter:card) directly into the raw HTML for social media crawlers.
- [x] **Vercel Function Consolidation**: Successfully avoided Vercel Hobby plan limits by consolidating edge functions directly into `api/public.ts`, ensuring smooth deployment of the OG feature.
- [x] **Branding Updates**: Updated root favicon across the platform to the new "RS" logo (`favicon.png` and `favicon.ico`), including cache-busting configurations.

---

## 🏗️ KEY ARCHITECTURE

```bash
/src
  /components
    PolicyPage.tsx         ← Front-end rendering of privacy, terms, and cookies
/api
  _utils/security.ts       ← Core rate-limiting and payload validation middleware
  webhooks/stripe.ts       ← Bulletproofed webhook verification logic + security integration
  public.ts                ← Consolidated handler for public routing and SEO meta injection
```

---

## 📁 FILES MOST RECENTLY MODIFIED

| File | Last Changed | Summary |
| --- | --- | --- |
| `src/components/PolicyPage.tsx` | 2026-06-07 | Privacy: Synced frontend with June 7, 2026 policy, added rich JSX layout, dynamic contact emails |
| `.npmrc` | 2026-06-07 | Build: Bypassed peer dependency conflicts to resolve Vercel deployment build failures |
| `api/_utils/security.ts` | 2026-06-07 | Security: Added request rate limit checking and payload schema verification |
| `api/*.ts` | 2026-06-07 | Security: Hardened all backend entry points with rate limiting and payload checks |
| `privacy_policy.md` | 2026-06-07 | Privacy: Updated text to June 7, 2026 version |

---

## ▶️ HOW TO RESUME

1. **Verify Build Health:** `npm run build`
2. **Review Deployment:** Confirm Vercel builds successfully with the new `.npmrc` configuration.
3. **Verify Security Headers:** Ensure API endpoints return appropriate responses when rate-limited or sent invalid payloads.

---

## 💡 DESIGN PRINCIPLES

- **"Value First"** — Users design their card *before* being asked to sign up or pay
- **Consistency** — `PricingCards` is one component used in both `/pricing` and the wizard
- **Minimal friction** — Clerk handles auth, `localStorage` bridges the pre/post-auth gap
- **Vercel Hobby constraints** — Stay under 12 serverless functions; consolidate where possible
