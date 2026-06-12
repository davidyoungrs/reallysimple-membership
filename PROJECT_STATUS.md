# 📋 PROJECT STATUS — Really Simple Apps (reallysimple-membership)

| Date | Head Commit |
| --- | --- |
| 2026-06-13 (Session 23) | `8bf43ed` |

> Repo: <https://github.com/davidyoungrs/reallysimple-membership>
> Local Dev: `npm run dev -- --port 5173`
> Live URL: Deployed via Vercel on `main` branch

---

## 🟢 CURRENT STATE — Where We Are Right Now

The platform is now in an **optimized, cleaned-up, and feature-rich** state. We have completed several major upgrades:

1. **Custom Multi-level Numbering System**: Designed and implemented a dynamic serial/numbering generator supporting segment tokens like `{CLUB}`, `{TYPE}`, `{YYYY}`, `{YY}`, `{MM}`, and `{NUMBER:X}` (e.g. `{NUMBER:4}` for 4-digit auto-incrementing padding). Built a live preview builder component in the admin club dashboard settings.
2. **"Member Since" Header Slot**: Added a database column `member_since` (Neon Postgres), integrated it into Apple Wallet pass generation (`headerFields` top-right slot), updated member creation/editing forms, CSV bulk registration mappings, and rendered the preview on the design/creator cards.
3. **Transition Speed Optimization (Caching)**: Promoted memberships, templates, and dashboard metrics fetching to `MembershipAdminLayout` context. Sub-menus now retrieve cached data instead of querying database/API endpoints on every navigation transition, resolving navigation slowness.
4. **CSV Bulk Template Download**: Provided a downloadable CSV blank template pre-populated with format guidelines directly on the admin members dashboard.
5. **Legacy Code Decommissioning**: Removed 34 unused files (legacy components and serverless functions inherited from the digital business cards repository) to optimize performance, clean up imports, and reduce production bundle footprints.

---

## ✅ COMPLETED WORK

### Advanced Features & Performance Optimization (Session 23)

- [x] **Multi-level Numbering System**: Added `{CLUB}`, `{TYPE}`, `{YYYY}`, `{YY}`, `{MM}`, and `{NUMBER:X}` tokens, updated membership API routes, and built a live preview config editor in [AdminMembershipClubs.tsx](file:///Volumes/Untitled/contact-tree-membership/src/components/admin/AdminMembershipClubs.tsx).
- [x] **"Member Since" Integration**: Added `member_since` to [schema.ts](file:///Volumes/Untitled/contact-tree-membership/src/db/schema.ts), mapped CSV bulk uploads/manual creation, and configured top-right Apple Wallet pass header mapping.
- [x] **Menu Transitions Cache**: Refactored [MembershipAdminLayout.tsx](file:///Volumes/Untitled/contact-tree-membership/src/components/membership/admin/MembershipAdminLayout.tsx) to cache data and share it using Outlet context, eliminating page-to-page database queries.
- [x] **Bulk Import Template Download**: Embedded CSV template generation in [MembershipAdminMembers.tsx](file:///Volumes/Untitled/contact-tree-membership/src/components/membership/admin/MembershipAdminMembers.tsx) for self-service downloads.
- [x] **Decommissioning Legacy Code**: Removed 34 unused files across components, admin panels, and api endpoints to simplify maintenance.

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

---

## 🏗️ KEY ARCHITECTURE

```bash
/src
  /components
    /membership
      /admin
        MembershipAdminLayout.tsx    ← Handles database queries cache and context propagation
        MembershipAdminMembers.tsx   ← Directory, template CSV exporter, and CSV upload parsing
        MembershipAdminTemplates.tsx ← Club templates layout with 6-template strict validation limit
      MembershipCardCreator.tsx      ← Card designer interface with "Member Since" and custom inputs
      MembershipCardPreview.tsx      ← Real-time visual SVG preview of front and back wallet passes
/api
  membership.ts                      ← Custom dynamic sequential numbering system & CSV import handler
  passes.ts                          ← Apple Wallet pass compiler & APNs trigger endpoints
```

---

## 📁 FILES MOST RECENTLY MODIFIED

| File | Last Changed | Summary |
| --- | --- | --- |
| `src/components/membership/admin/MembershipAdminLayout.tsx` | 2026-06-12 | Optimized transitions: Lifted template, membership, and dashboard queries to parent context. |
| `src/components/admin/AdminMembershipClubs.tsx` | 2026-06-12 | Numbering System: Added dynamic token selector UI & live generated code format previewing. |
| `src/components/membership/admin/MembershipAdminMembers.tsx` | 2026-06-12 | CSV Import: Added template CSV download action & mapped "Member Since" headers. |
| `src/components/membership/MembershipCardCreator.tsx` | 2026-06-12 | Creator: Rendered "Member Since" (4-digit numeric field) in form inputs. |
| `api/membership.ts` | 2026-06-12 | Core Logic: Replaced static numbering with multi-token parsing engine, added creation limit guards. |
| `db/schema.ts` | 2026-06-12 | Schema: Added `member_since` column to `memberships` table. |

---

## ▶️ HOW TO RESUME

1. **Verify Build Health:** `npm run build`
2. **Launch Local Server:** `npm run dev -- --port 5173`
3. **Verify CSV Template & Import:** Check if the CSV template download matches the expected import headers.

---

## 💡 DESIGN PRINCIPLES

- **Caching over Round-Trips** — Avoid calling backend routes repeatedly on simple admin page navigation.
- **Strict Validations** — Hard rules like "max 6 templates per club" must be enforced on both client interfaces and server APIs.
- **Dynamic Configs** — Standard formatting engines (like membership serial numbers) should be flexible and predictable.
