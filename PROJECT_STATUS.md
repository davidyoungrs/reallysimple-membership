# 📋 PROJECT STATUS — Really Simple Apps (reallysimple-membership)

| Date | Head Commit |
| --- | --- |
| 2026-06-27 (Session 30) | `d80a57b` |

> Repo: <https://github.com/davidyoungrs/reallysimple-membership>
> Local Dev: `npm run dev -- --port 5173`
> Live URL: Deployed via Vercel on `main` branch

---

## 🟢 CURRENT STATE — Where We Are Right Now

The platform is in a **production-ready, secure, clean, and fully-optimized** state. It has passed a comprehensive security audit with all identified vulnerabilities patched. A full launch checklist (`LAUNCH_CHECKLIST.md`) is in the project root covering all steps required for custom domain go-live.

---

## ✅ COMPLETED WORK

### Full Security Audit & Hardening (Session 30)
- [x] **User Manual**: Created a comprehensive text-only user guide (`/admin/manual`) with full navigation from the admin sidebar.
- [x] **Superuser-only Menu Items**: Hidden Security and Settings nav links from standard admins in `AdminSidebar.tsx`.
- [x] **Client-side Route Guards**: Added superuser redirect checks in `AdminSecurity.tsx` and `AdminSettings.tsx` — direct URL entry redirects to `/admin/no-access`.
- [x] **Server-side API Guard**: Updated `/api/admin` to check `isSuperUser` instead of `isAdmin` — standard admins receive `403` even on direct API calls.
- [x] **Unauthenticated push_test Fixed**: Moved `push_test` route inside the superuser auth guard — was previously callable by anyone.
- [x] **CLERK_BYPASS_AUTH Production Guard**: Added `NODE_ENV !== 'production'` check so the auth bypass flag can never activate in Vercel production.
- [x] **Cron Endpoint Auth Guard**: Added `CRON_SECRET` Bearer token check to `/api/cron/expiry-alerts` to prevent email abuse.
- [x] **Error Detail Leakage Fixed**: Removed `details: error?.message` from 500 responses in `membership.ts` and `public.ts`.
- [x] **CORS Restricted on Pass Endpoints**: Replaced wildcard `*` CORS with `VITE_APP_URL` env var on both Google Wallet pass handlers.
- [x] **Launch Checklist Created**: Wrote `LAUNCH_CHECKLIST.md` covering all 9 phases of custom domain go-live.
- [x] **Full Production Build Verification**: All builds compile successfully with zero TypeScript errors across all sessions.

### Sidebar Navigation Reordering (Session 29)
- [x] **Sidebar Menu Order**: Moved the "Templates" menu item to be directly under "Overview" in the left-hand workspace sidebar.
- [x] **Full Production Build Verification**: Ran `npm run build` successfully with zero TypeScript compilation errors.

### Card Issuance, Sidebar Routing, Expiry Filters & Spacing Updates (Session 28)
- [x] **Strip Image URL Preservation**: Save the generated and uploaded `stripImageUrl` to the database on first card issuance (POST request).
- [x] **Main Panel Redirection**: Redirect the sidebar "Main Panel" link to target `/admin` for all club workspace views.
- [x] **Expiry Date Filters**: Support filtering members list by expirations (< 30 days, 30-60 days, 60-90 days, or custom date range picker).
- [x] **Typography & Vertical Spacing**: Set primary font to Inter with a line-height of 1.55, and unified dashboard margins/paddings.
- [x] **Full Production Build Verification**: Ran `npm run build` successfully with zero TypeScript compilation errors.

### Security, Abuse Protection & Upload Optimization (Session 27)
- [x] **Bot & Scraper Blocker**: Filter out known scripting user-agents from accessing backend serverless endpoints.
- [x] **Global Database Rate Limiting**: Count log records in the Neon `api_logs` table under a sliding 1-minute window to throttle concurrent serverless attacks globally.
- [x] **Express Response Logging Interceptor**: Automatically patch response handlers to calculate query latency and insert logs to the database.
- [x] **Stripe Webhook Exemption**: Bypassed rate limiting on Stripe webhook signature validations to guarantee payment events process without delay.
- [x] **Avatar Upload File Size Guard**: Implemented a 1MB file size limit in the card creator, blocking files exceeding 1MB and displaying a warning.
- [x] **Avatar Loading UI Refinement**: Hid the "Photo Loaded ✓" badge during active avatar uploads.
- [x] **Lighthouse Core Web Vitals Optimization**: Removed 404 preload link, optimized Google Font payload weights, and deferred Leaflet map CSS.
- [x] **Full Production Build Verification**: Ran `npm run build` successfully with zero TypeScript compilation errors.

### Visual Reordering, Tooltips & Cleanups (Session 26)
- [x] **Visual Club Reordering (D&D)**: Integrated drag-and-drop handles for sorting clubs with persistent order updating.
- [x] **Restored Edit Branding**: Allowed standard admins to edit branding on assigned clubs without exposing creation/deletion triggers.
- [x] **Super User Routing Fallback**: Created a premium Access Denied redirect page to gracefully route unauthorized dashboard attempts.
- [x] **Email-Based Pre-Authorization**: Configured DB and auto-linking logic to bind pending email invitations to Clerk accounts on signup.
- [x] **Codebase Dead Code Purging**: Purged unused files, developer scratch scripts, and obsolete frontend views.
- [x] **Application-wide Tooltips**: Added contextual tooltips using a custom, lightweight CSS-and-React popup component.

---

## 🏗️ KEY ARCHITECTURE

```bash
/src
  /components
    /membership
      /admin
        MembershipAdminLayout.tsx    ← Handles database queries cache and context propagation
        MembershipAdminMembers.tsx   ← Directory, template CSV exporter, and CSV upload parsing
        MembershipAdminTemplates.tsx ← Club templates layout with custom strip background config, upload, delete, backFields
      MembershipCardCreator.tsx      ← Card designer interface with "Member Since", avatar upload size guard, and dynamic strip rendering
      MembershipCardPreview.tsx      ← Real-time visual SVG preview of front and back wallet passes
      MembershipStripDesigner.tsx    ← Visual banner editor with full-width stacked cards & interactive canvas cropping
    Tooltip.tsx                      ← Lightweight, zero-dependency helper component for admin panels
/api
  /admin
    index.ts                         ← Security-logged, bot-blocked admin statistics and metadata handler
  /_utils
    security.ts                      ← Hybrid rate limiting, bot blocker filters, and monkey-patched response logger
  membership.ts                      ← Custom numbering, CSV imports, and PUT image garbage collection
  passes.ts                          ← Apple Wallet pass compiler & APNs push trigger endpoints
  apple-webhook.ts                   ← Apple Wallet registration and callback endpoints
  /webhooks
    stripe.ts                        ← Stripe payment checkout and renewal webhook event handler
```

---

## 📁 FILES MOST RECENTLY MODIFIED

| File | Last Changed | Summary |
| --- | --- | --- |
| `api/admin/index.ts` | 2026-06-27 | Moved `push_test` behind superuser auth guard; enforced `isSuperUser` on all admin API requests. |
| `api/membership.ts` | 2026-06-27 | Added `NODE_ENV !== 'production'` guard to `CLERK_BYPASS_AUTH`; removed error detail leakage from 500 response. |
| `api/public.ts` | 2026-06-27 | Removed `details: error?.message` from 500 response in `handleSystemStatus`. |
| `api/passes.ts` | 2026-06-27 | Restricted CORS `Access-Control-Allow-Origin` from `*` to `VITE_APP_URL` on both Google Wallet handlers. |
| `api/cron/expiry-alerts.ts` | 2026-06-27 | Added `CRON_SECRET` Bearer token authorization check to prevent external triggering. |
| `src/components/admin/AdminSidebar.tsx` | 2026-06-27 | Hidden Security and Settings links from non-superuser admins; added User Manual link. |
| `src/components/admin/AdminSecurity.tsx` | 2026-06-27 | Added client-side superuser check — redirects to `/admin/no-access` on direct URL entry. |
| `src/components/admin/AdminSettings.tsx` | 2026-06-27 | Added client-side superuser check — redirects to `/admin/no-access` on direct URL entry. |
| `src/components/admin/AdminManual.tsx` | 2026-06-27 | New component — full user guide rendered at `/admin/manual`. |
| `LAUNCH_CHECKLIST.md` | 2026-06-27 | New file — 9-phase go-live checklist for custom domain deployment. |

---

## ▶️ HOW TO RESUME

1. **See `LAUNCH_CHECKLIST.md`** for the full custom domain go-live guide
2. **Add new env vars to Vercel:**
   - `CRON_SECRET` = `31fb1be23adefb3e557f1de7dcb9bd4206cee4c1e3a0fc3f648825b90f37f842`
   - `VITE_APP_URL` = `https://yourdomain.com`
   - `SUPERUSER_EMAIL` = your email address
3. **Configure Production Credentials**: Ensure all wallet and payment keys are in Vercel:
   - `APPLE_APNS_AUTH_KEY`, `WALLET_WWDR_CERT`, `WALLET_SIGNER_CERT`, `WALLET_SIGNER_KEY`
   - `STRIPE_SECRET_KEY` (live), `STRIPE_WEBHOOK_SECRET` (live)
4. **Verify Build Health:** `npm run build`
5. **Launch Local Server:** `npm run dev -- --port 5173`

---

## 💡 DESIGN PRINCIPLES

- **Security By Default** — Shield Vercel functions from crawlers, bot sweeps, and brute force requests natively.
- **Fail Closed for Auth, Fail Open for Payments** — Webhooks should bypass rate limits to avoid customer payment failure delays.
- **Optimized Assets** — Restrict file upload sizes early on the client-side to save bandwidth and Cloudflare storage.
