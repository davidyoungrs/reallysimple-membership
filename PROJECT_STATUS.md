# 📋 PROJECT STATUS — Really Simple Apps (reallysimple-new)

| Date | Head Commit |
| --- | --- |
| 2026-06-09 (Session 21) | `local-dev` |

> Repo: <https://github.com/davidyoungrs/reallysimple-new>
> Local Dev: `npm run dev -- --port 5173` (from `/Users/davidyoung/contact-tree`)
> Live URL: Deployed via Vercel on `main` branch

---

## 🟢 CURRENT STATE — Where We Are Right Now

The platform is now in an **Optimized, Hardened, and Secure** state. We have completed the following key tasks:

1. **API Security Hardening**: Implemented rate limiting and JSON payload validation middleware (`api/_utils/security.ts`) and integrated them across all key serverless functions to protect against abuse. Added a development bypass for rate limiting to prevent local lockout during page reloads.
2. **Database Transactions**: Migrated database driver connection from `neon-http` to WebSocket-based `neon-serverless` Pool (`src/db/index.ts`) to enable full support for SQL transactions (which are required for creating and editing clubs and templates).
3. **CSP & Upload Support**: Updated CSP meta tags in `index.html` to allow connection to Cloudflare R2 storage bucket URLs and to load images/avatars from Unsplash (`images.unsplash.com`).
4. **Vite Mock Clerk Infinite Loop Fix**: Resolved an infinite re-render loop in frontend pages by stabilizing the `getToken` reference returned by the mocked Clerk hook (`src/components/MockClerk.tsx`).

---

## ✅ COMPLETED WORK

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
  - Contact and Admin pages (`api/contact.ts`, `api/admin/index.ts`, `api/wallet-sync.ts`)

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
