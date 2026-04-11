# 📋 PROJECT STATUS — Really Simple Apps (reallysimple-new)

> Last Updated: 2026-04-11 (Session 17) | Head Commit: `e3f1dc1`
> Repo: https://github.com/davidyoungrs/reallysimple-new
> Local Dev: `npm run dev -- --port 5173` (from `/Users/davidyoung/contact-tree`)
> Live URL: Deployed via Vercel on `main` branch

---

## 🟢 CURRENT STATE — Where We Are Right Now

The project is a **digital business card SaaS** built in **React + Vite + TypeScript**. We have recently completed two major infrastructure and UX phases:

1. **Phase 5 (Tier Gating)**: Implemented strict feature gating for Starter and Pro tiers. Starter users are now limited to 1 card, 2 phone numbers, and 3 social links, with high-end branding disabled.
2. **Phase 13 (Admin Dashboard)**: Transformed the Super Admin dashboard into a premium analytics suite with traffic source distribution, top-performer leaderboards, and interactive stat cards.
3. **Session 16-17 (Billing & Wallet Sync)**: Resolved Stripe webhook race conditions affecting tier state. Added direct subscription cancellation functionality and a manual APNs "Push to Wallet" sync system directly within the React Designer.

---

## ✅ COMPLETED WORK

### Subscription & Wallet Integrations (Session 16-17)

- [x] **Webhook Race Condition**: Fixed stale `update` webhooks reverting explicit `deleted` cancellations.
- [x] **Direct Subscription Cleanup**: Added `api/billing.ts?action=cancel`, enabling direct Stripe direct plan termination immediately from the frontend UI.
- [x] **UI Tier Syncing**: Modified `TierContext.tsx` with a `window` focus listener to auto-refresh tier status dynamically.
- [x] **Manual Wallet Push (APNs)**: Designed `/api/wallet-sync.ts` and created a "Push Updates" UI so users can trigger forced Apple Wallet syncs globally.
- [x] **Wallet UI Refactor**: Merged `Branding` and `Style` sections inside the Wallet App Designer into a streamlined layout with React Portals fixing container constraints.
- [x] **Clerk Smart Routing**: Configured auth to push returning users dynamically to `/dashboard` while tunneling organic sign-ups directly to `/onboarding`.

### Feature Gating & Tier Limits (Phase 5)

- [x] **Strict Card Limits**: Users are now capped based on tier (Starter: 1, Pro: 5, Pro+: 10).
- [x] **Field Constraints**: Starter tier cards now enforced to 2 phone numbers and 3 social links.
- [x] **Branding Gating**: High-end background effects, themes, and "Matched Logo" colors now require a Pro upgrade.
- [x] **Upgrade Modals**: Integrated `UpgradeModal` triggers across the Card Builder, Dashboard, and Wallet Designer.
- [x] **Tier Logic Utility**: Centralized tier checks in `src/utils/tier-limits.ts`.

### Super Admin Dashboard (Phase 13)

- [x] **Interactive Overview**: Clickable summary cards for Users and Cards for instant management navigation.
- [x] **Aggregate Analytics**: New backend queries for **Traffic Source Distribution** (QR, Direct, Social).
- [x] **Performance Leaderboard**: "Top Performing Cards" module showing profiles with highest 30-day view counts.
- [x] **Premium UX**: Integrated **Skeleton Screen Loaders** for all data-heavy sections (Charts, Heatmaps, Activity feeds).
- [x] **Live Activity Feed**: Added pulsating indicator and enhanced formatting to the platform-wide activity stream.

### Deployment & Stability

- [x] Vercel Hobby plan function limit fixed (consolidated to ≤12 serverless functions).
- [x] **Build Fix (Session 14)**: Removed unused `croppingImage` state in `WalletBuilder.tsx` to resolve `TS6133` error.
- [x] **Tier Sync Fix (Session 15)**: 
    - [x] Disabled caching for `/api/user` with `Cache-Control: no-store`.
    - [x] Implemented Clerk `publicMetadata` sync in Stripe webhook handlers.
    - [x] Manually synchronized affected accounts to ensure immediate unlock.

---

## 🏗️ KEY ARCHITECTURE

```bash
/src
  /components
    OnboardingWizard.tsx   ← Public /create route (PLG wizard)
    Admin/AdminDashboard.tsx ← Super Admin mission control
    WalletBuilder.tsx      ← Apple/Google Wallet Designer
    PricingCards.tsx       ← Shared pricing component
    UpgradeModal.tsx       ← Gating trigger component

/api/admin
  index.ts                 ← Consolidated admin analytics & aggregation

/src/utils
  tier-limits.ts           ← Centralized business logic for tier constraints
```

---

## 📁 FILES MOST RECENTLY MODIFIED

| File | Last Changed | Summary |
| --- | --- | --- |
| `api/webhooks/stripe.ts` | 2026-04-10 | Fixed webhook race condition dropping tier deletions |
| `src/components/WalletBuilder.tsx` | 2026-04-11 | Integrated Apple wallet manual sync and condensed layout |
| `api/wallet-sync.ts` | 2026-04-11 | Created direct Apple Push Notification route |
| `src/main.tsx` | 2026-04-11 | Clerk auto-routing updated to dashboard/onboarding paths |
| `PROJECT_STATUS.md` | 2026-04-11 | Session 17 tracking (this file) |

---

## ▶️ HOW TO RESUME

1. **Start dev server:** `npm run dev -- --port 5173`
2. **Check build health:** `npm run build` (should exit with 0)
3. **Verify Gating:** Log in as a Starter user and try to add a 2nd card or more than 3 social links.
4. **Inspect Admin Hub:** Access `/admin` to verify the new source distribution charts and leaderboard.

### Suggested Next Session Starting Point

- **Verify Stripe Webhook Robustness**: Investigate the intermittent "Signature verification" failures mentioned in Vercel logs to ensure no events are being dropped.
- **Google Wallet Credentials**: Pick up from "PARKED #4" to finalize the Google Pay integration.

---

## 💡 DESIGN PRINCIPLES

- **"Value First"** — Users design their card *before* being asked to sign up or pay
- **Consistency** — `PricingCards` is one component used in both `/pricing` and the wizard
- **Minimal friction** — Clerk handles auth, `localStorage` bridges the pre/post-auth gap
- **Vercel Hobby constraints** — Stay under 12 serverless functions; consolidate where possible
