# 📋 PROJECT STATUS — Really Simple Apps (reallysimple-membership)

| Date | Head Commit |
| --- | --- |
| 2026-06-21 (Session 27) | `main` |

> Repo: <https://github.com/davidyoungrs/reallysimple-membership>
> Local Dev: `npm run dev -- --port 5173`
> Live URL: Deployed via Vercel on `main` branch

---

## 🟢 CURRENT STATE — Where We Are Right Now

The platform is in a **production-ready, secure, clean, and fully-optimized** state. We have implemented substantial enhancements:

1. **Abuse Protection & Bot Filtering**: Introduced a bot/scraper detection filter blocking automated scripting clients (`curl`, `scrapy`, `axios`, etc.) with a `403` status while allowing SEO/sharing crawlers.
2. **Hybrid Rate Limiting**: Added persistent, database-backed global rate limiting (max 20 requests/minute) for sensitive write/generation operations like passes and membership mutations, while protecting public endpoints with fast in-memory rate limiting.
3. **Response Logging Middleware**: Integrated an automatic monkey-patched request logging interceptor that records all query latencies, endpoints, and statuses directly to the database `api_logs` table.
4. **Exempted Stripe Webhooks**: Ensured Stripe payments proceed without delay by bypassing rate limits on Stripe webhook endpoints while still logging request events.
5. **Avatar Upload Limit & Warning**: Added a 1MB file size upload limit in the card creator, warning the user and resetting input if a larger photo is selected.
6. **Avatar Upload UI Fix**: Hid the "Photo Loaded ✓" status indicator while a new avatar is actively loading.
7. **Visual Club Reordering via Drag-and-Drop**: Integrated `@dnd-kit/core` and `@dnd-kit/sortable` to support visual reordering of clubs on the Super User dashboard, persisted in the database via a `sortOrder` column.
8. **Email-Based Admin Pre-Authorization**: Allowed pre-authorizing club admins by email before Clerk signup. The system automatically links pre-authorizations to their Clerk accounts upon first login.
9. **Codebase Cleanup & Purge**: Purged 34+ dead codebase files, legacy developer scratch scripts, and unused npm dependencies (`react-easy-crop` and `vcard-creator`) to minimize package bundle sizes.
10. **Application-wide Contextual Tooltips**: Added inline, zero-dependency contextual help tooltips across 7 administrator panel views.

---

## ✅ COMPLETED WORK

### Security, Abuse Protection & Upload Optimization (Session 27)
- [x] **Bot & Scraper Blocker**: Filter out known scripting user-agents from accessing backend serverless endpoints.
- [x] **Global Database Rate Limiting**: Count log records in the Neon `api_logs` table under a sliding 1-minute window to throttle concurrent serverless attacks globally.
- [x] **Express Response Logging Interceptor**: Automatically patch response handlers to calculate query latency and insert logs to the database.
- [x] **Stripe Webhook Exemption**: Bypassed rate limiting on Stripe webhook signature validations to guarantee payment events process without delay.
- [x] **Avatar Upload File Size Guard**: Implemented a 1MB file size limit in the card creator, blocking files exceeding 1MB and displaying a warning.
- [x] **Avatar Loading UI Refinement**: Hid the "Photo Loaded ✓" badge during active avatar uploads.
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
| `src/components/membership/MembershipCardCreator.tsx` | 2026-06-21 | Added 1MB avatar size validation and hid the 'Photo Loaded' text during active uploads. |
| `api/_utils/security.ts` | 2026-06-20 | Added bot filtering, monkey-patched logging middleware, and global db rate-limiting queries. |
| `api/public.ts` | 2026-06-20 | Bound response logging, bot checks, and public in-memory rate limiting. |
| `api/passes.ts` | 2026-06-21 | Integrated bot blocker, database logs, and async rate-limiting. |
| `api/membership.ts` | 2026-06-21 | Integrated bot blocker, database logs, and async rate-limiting. |
| `api/admin/index.ts` | 2026-06-21 | Integrated bot blocker, database logs, and async rate-limiting. |
| `api/apple-webhook.ts` | 2026-06-21 | Integrated bot blocker, database logs, and async rate-limiting. |
| `api/webhooks/stripe.ts` | 2026-06-21 | Removed rate-limiting call to protect payments while keeping latency response logs. |

---

## ▶️ HOW TO RESUME

1. **Configure Production Credentials**: Ensure the following variables are uploaded to Vercel/production environment:
   - `APPLE_APNS_AUTH_KEY` (Contents of `apns.p8`)
   - `WALLET_WWDR_CERT` (Contents of `wwdr.pem`)
   - `WALLET_SIGNER_CERT` (Contents of `signerCert.pem`)
   - `WALLET_SIGNER_KEY` (Contents of `signerKey.pem`)
2. **Verify Build Health:** `npm run build`
3. **Launch Local Server:** `npm run dev -- --port 5173`

---

## 💡 DESIGN PRINCIPLES

- **Security By Default** — Shield Vercel functions from crawlers, bot sweeps, and brute force requests natively.
- **Fail Closed for Auth, Fail Open for Payments** — Webhooks should bypass rate limits to avoid customer payment failure delays.
- **Optimized Assets** — Restrict file upload sizes early on the client-side to save bandwidth and Cloudflare storage.
