# 📋 PROJECT STATUS — Really Simple Apps (reallysimple-new)
> Last Updated: 2026-03-31 (Session 5) | Head Commit: `a6485d2`
> Repo: https://github.com/davidyoungrs/reallysimple-new
> Local Dev: `npm run dev -- --port 5173` (from `/Users/davidyoung/contact-tree`)
> Live URL: Deployed via Vercel on `main` branch

---

## 🟢 CURRENT STATE — Where We Are Right Now

The project is a **digital business card SaaS** built in **React + Vite + TypeScript**, deployed on **Vercel (Hobby plan)**, using **Clerk** for auth, **Neon DB** for the database, and **Stripe** for billing.

The focus of the last several sessions has been:

1. **Stabilising the Vercel deployment** (function count, build errors)
2. **Redesigning the Onboarding Wizard** (`/create` route) for high conversion (PLG — "Try Before You Buy")
3. **Mobile UX Audit & Optimization**: Keyboard modes, horizontal overflow, centering logic.
4. **Multi-Language Expansion**: Dynamic "on-the-fly" translation for user-entered content (Bio/Job Title/Name).
5. **i18n Stability**: Fixed critical syntax and duplicate key issues in `src/i18n.ts` that were blocking production builds.

---

## ✅ COMPLETED WORK

### Onboarding Wizard (`/src/components/OnboardingWizard.tsx`)

- [x] Converted from 3-step to **2-step PLG flow**: Step 1 = Design, Step 2 = Pricing
- [x] Step 1 includes: Profile Photo, Name, Title, Email, Mobile, Office, Website, Company, Bio, Logo, **14 Cool Palettes**, 20 fonts
- [x] **Fixed sidebar scrolling** — footer is now in the flex flow (not `absolute bottom-0`)
- [x] **Fixed colour change lag** — removed `animate-gradient-slow` from `BusinessCard.tsx` background div; all colours now change instantly
- [x] **Expanded typography** from 4 → 20 options (full parity with the card editor)
- [x] **Step 2 layout** is now **70% pricing panel / 30% card preview** (widens on step transition)
- [x] **Step 1 layout** is 50% form / 50% preview
- [x] Step 2 uses the shared `PricingCards` component (100% consistent with `/pricing` page)
- [x] **6 new COOL PALETTES** added: Copper, Neo Mint, Aurora, Blush, Slate, Gold
- [x] **Step 1 heading** updated to **"Design Your Online Card"**

### Landing Page (`/src/components/LandingPage.tsx`)
- [x] Removed **"View Demo"** button from hero — only "Start for Free" CTA remains
- [x] Homepage CTA buttons route to `/create` (the onboarding wizard)

### Pricing (`/src/components/Pricing.tsx` + `PricingCards.tsx`)
- [x] Pricing section added to homepage as a preview
- [x] `PricingCards` refactored with an `onSelect` prop so it works both standalone and inside the wizard
- [x] Annual pricing standardised to 10x monthly ("2 Months Free")
- [x] Localized across all supported languages

### Billing & Emails
- [x] Automated welcome email on registration
- [x] Automated billing notification emails for renewals and payment failures
- [x] Resend API sender domain updated to `reallysimpleapps.com`
- [x] Leads email notifications working

### Auth & Routing
- [x] Clerk auth integrated — `/create` is **public**, `/dashboard` is protected
- [x] `/onboarding-callback` route processes Clerk sign-up and saves pre-auth data from `localStorage` to Neon DB
- [x] `/editor` route added and working

### Deployment & Stability
- [x] Vercel Hobby plan function limit fixed (consolidated to ≤12 serverless functions)
- [x] All known TypeScript build errors resolved
- [x] Build consistently exits with code 0
- [x] **CSP Updated**: Allowed connection to `api.mymemory.translated.net` for translations.

### Mobile & Responsive UX (`ui-ux-pro-max-skill` Audit)
- [x] **Horizontal Scroll Lockdown**: Added `overflow-x-hidden w-full` to `body` in `index.html`.
- [x] **Mobile Keyboards**: Added `inputMode` (email, tel, numeric) to all critical fields app-wide.
- [x] **Navbar Centering**: Fixed "Log in" and "Create Card" wrapping/alignment on small screens.
- [x] **Dynamic Card Translation**: Added floating globe icon + MyMemory API integration for Bio & Title translation.
- [x] **Pro Plan Features**: Expanded list with unlimited phone numbers, social links, and style control.

### Internationalization (i18n) Stability
- [x] **Build Error Resolution**: Fixed structural syntax errors (missing closing braces) in `src/i18n.ts` for `ru`, `ja`, and `pnb` language blocks.
- [x] **Hindi Translation Cleanup**: Removed ~35 duplicate keys in the `hi` block that caused TypeScript "duplicate property" errors.
- [x] **Production Verification**: Confirmed that `npm run build` now completes successfully for all 14 supported languages.

---

### 1. Enhanced Profile Translation
- **Goal:** Include `fullName` in the card's dynamic translation and add a "push back" mechanism to allow users to apply translated content to their card data permanently.
- **Status:** Planning phase; implementation plan created and awaiting approval.
- **Files:** `BusinessCard.tsx`, `CardBuilder.tsx`, `Editor.tsx`.

---

## 🟡 PARKED — To Come Back To

These are features that were discussed or partially started but deliberately set aside:

### 1. End-to-End Onboarding Data Flow Verification
- **What:** Verify that all new Step 1 fields (Mobile, Office, Profile Photo, Bio, Logo) are correctly:
  1. Persisted to `localStorage` after the wizard
  2. Successfully read and saved to Neon DB in `/onboarding-callback`
- **Why parked:** Core UI was the focus; E2E was not fully tested
- **File to check:** `src/pages/OnboardingCallback.tsx`

### 2. Card Editor Parity with Wizard
- **What:** The card editor (`/editor`) has more advanced options (Layout Mode, Photo Style, Sticky Action Bar, custom colour pickers). Consider whether these should also be surfaced in the Wizard or remain editor-only.
- **Why parked:** Scope decision needed from user

### 3. Rich Media Embeds in Wizard
- **What:** The full card editor supports YouTube, Spotify, Instagram, TikTok, Vimeo embeds. The Wizard does not.
- **Why parked:** Complexity — post-MVP feature

### 4. Google Wallet Integration (Known Issue)
- **What:** Google Wallet `.pkpass` generation has a known bug (see KI: `google_wallet_integration`). The Apple Wallet pass generation is working.
- **Why parked:** Requires Google Pay credentials and extra backend work

### 5. Analytics Dashboard
- **What:** Card analytics (click tracking, lead tracking, Recharts dashboard) are implemented. No known issues but has not been reviewed recently.
- **File:** Used in `/dashboard` — the `analytics_system` KI has details

### 6. Admin Panel — Logo URL
- **What:** Custom logo URL was removed from the Admin Panel UI; logos are now managed directly in Neon DB DB. This is intentional.
- **Note:** If you need to add a logo for a user, do it directly in the `cards` table in Neon DB.

### 7. Website Sitemap / SEO
- **What:** A website map was generated (see previous session). SEO meta tags and structured data have not yet been implemented per that map.
- **Why parked:** Not prioritised

---

## 🔴 KNOWN ISSUES / GOTCHAS

| Issue | Detail | Workaround |
|---|---|---|
| Vercel Hobby = 12 function limit | Currently at ~10 functions. Adding new API routes risks hitting the limit. | Consolidate into existing handlers in `/api/` |
| Large bundle warning | `index.js` ~677KB gzipped. Not blocking but worth addressing later. | Code-split with dynamic `import()` |
| `localStorage` data TTL | Pre-auth wizard data sits in `localStorage` indefinitely. No expiry. | Manual clear or add TTL logic in `OnboardingCallback` |
| TypeScript strict mode | Some `any` types used in older components. Not breaking but not clean. | Gradual cleanup |

---

## 🏗️ KEY ARCHITECTURE

```
/src
  /components
    OnboardingWizard.tsx   ← Public /create route (PLG wizard)
    BusinessCard.tsx       ← The card renderer (used everywhere)
    Editor.tsx             ← Full card editor (authenticated users)
    PricingCards.tsx       ← Shared pricing component
    LandingPage.tsx        ← Homepage
    /Admin/                ← Admin panel components
    /leads/                ← Lead capture form

/api                       ← Vercel serverless functions
  billing.ts               ← Stripe billing (consolidated)
  user.ts                  ← User CRUD (consolidated)
  admin.ts                 ← Admin operations
  leads.ts                 ← Lead form + email notification
  passes.ts                ← Apple Wallet .pkpass generation

/src/types.ts              ← CardData interface (single source of truth)
```

### State Management
- **Pre-auth data:** `localStorage` key `wizard_data`
- **Post-auth data:** Neon DB `cards` table
- **Feature gating:** `useTier()` context hook

### Pricing Tiers
- **Starter** — Free, limited features
- **Pro** — Paid, custom themes, analytics
- **Pro Plus** — Advanced features
- **Business** — Team features
- **Grandfathered** — Legacy users with locked pricing

---

## 📁 FILES MOST RECENTLY MODIFIED

| File | Last Changed | Summary |
|---|---|---|
| `src/components/BusinessCard.tsx` | 2026-03-31 | Dynamic translation + language selector icon |
| `src/utils/translation.ts` | 2026-03-31 | New MyMemory API utility |
| `index.html` | 2026-03-31 | CSP update + overflow lockdown |
| `src/components/OnboardingWizard.tsx` | 2026-03-31 | Mobile keyboard (inputMode) optimization |
| `PROJECT_STATUS.md` | 2026-03-31 | Session 4 tracking (this file) |

---

## ▶️ HOW TO RESUME

1. **Start dev server:** `npm run dev -- --port 5173` in `/Users/davidyoung/contact-tree`
2. **Open browser:** http://localhost:5173
3. **Test onboarding:** http://localhost:5173/create
4. **Check build:** `npm run build`
5. **Push to deploy:** `git add -A && git commit -m "..." && git push`
6. **Vercel logs:** Check the dashboard at https://vercel.com for deployment status

### Suggested Next Session Starting Point
> Pick up from **"PARKED #1"** — verify the E2E data flow from the wizard through to Neon DB on sign-up. This ensures all the new fields (mobile, office, photo) are actually being saved and shown in the editor after registration.

---

## 💡 DESIGN PRINCIPLES (don't forget these)

- **"Value First"** — Users design their card *before* being asked to sign up or pay
- **Consistency** — `PricingCards` is one component used in both `/pricing` and the wizard
- **Minimal friction** — Clerk handles auth, `localStorage` bridges the pre/post-auth gap
- **Vercel Hobby constraints** — Stay under 12 serverless functions; consolidate where possible
