# 📋 PROJECT STATUS — Really Simple Apps (reallysimple-membership)

| Date | Head Commit |
| --- | --- |
| 2026-06-15 (Session 26) | `main` |

> Repo: <https://github.com/davidyoungrs/reallysimple-membership>
> Local Dev: `npm run dev -- --port 5173`
> Live URL: Deployed via Vercel on `main` branch

---

## 🟢 CURRENT STATE — Where We Are Right Now

The platform is now in a **secure, optimized, cleaned-up, and feature-rich** state. We have completed several major upgrades:

1. **Secret Scanning & Security Cleanup**: Scanned the codebase for hardcoded keys, passwords, and tokens. Removed sensitive Apple Wallet certs and APNs private keys from Git tracking to ensure zero credentials are exposed or committed.
2. **Custom Multi-level Numbering System**: Designed and implemented a dynamic serial/numbering generator supporting segment tokens like `{CLUB}`, `{TYPE}`, `{YYYY}`, `{YY}`, `{MM}`, and `{NUMBER:X}` (e.g. `{NUMBER:4}` for 4-digit auto-incrementing padding). Built a live preview builder component in the admin club dashboard settings.
3. **"Member Since" Header Slot**: Added a database column `member_since` (Neon Postgres), integrated it into Apple Wallet pass generation (`headerFields` top-right slot), updated member creation/editing forms, CSV bulk registration mappings, and rendered the preview on the design/creator cards.
4. **Transition Speed & Fetching Loop Fixes**: Fixed severe screen flickering and Vercel query floods (rate limiting) by removing unstable Clerk `getToken` references and redundant `useEffect` hooks in dashboard sub-screens. Layout context caching now handles data loading stably.
5. **Class A & B Storage Optimization**: Optimized Cloudflare R2 bucket transactions by automatically deleting replaced images from storage during membership updates (Garbage Collection) and executing frontend dirty checks to skip regenerating strip images if styles/fields are unchanged.
6. **Interactive Avatar Cropping & Alignment**: Added direct-canvas dragging (mouse and touch events) and scroll-to-zoom on the profile crop circle within the Strip Image Designer, accompanied by secondary offset and scale range slider controls. Synchronized this math with the final canvas PNG generator.
7. **Guided Link Builder for Pass Back**: Implemented a guided UI that splits simple text fields from web links on the back-of-card settings, enabling admins to input Link Text and Link URL independently. Under the hood, these are stored in standard Markdown and compiled to native links for Apple and Google Wallet passes.
8. **Template Custom Strip Background**: Integrated custom options in templates allowing administrators to select "Match Pass Background", "Custom Solid Color", or upload a custom image (uploaded directly to R2) for the strip banner. Enabled the on-the-fly canvas rendering engine to pull, filter, and draw template background images dynamically.
9. **Template Deletion & Cascade Handler**: Integrated template deletion support with confirmation warning dialogs and backend handlers to clean up templates safely.
10. **Full-Width Controls Layout**: Redesigned the Strip Designer modal controls into a vertically stacked, full-width column layout (`w-full`) with a fixed, non-scrolling preview workspace on the left (desktop) or top (mobile).
11. **Deleted Member Filtering**: Filtered out logically deleted/scrubbed member records from the dashboard layout state so that they no longer skew metrics like "TOTAL REGISTERED", "Revoked Cards", or appear in "Recent Members" lists.

---

## ✅ COMPLETED WORK

### Advanced Media, Deletions, and UI Polish (Session 26)

- [x] **Interactive Avatar Panning & Scaling**: Programmed mouse drag, touch pan, and scroll-to-zoom actions directly on the designer canvas to dynamically position profile photos within the crop circle. Integrated with standard controls (scale, pan offset sliders, position reset).
- [x] **Pass Back-of-Card Guided Link Builder**: Added a wizard interface separating plain text fields from interactive web/contact links (asking for Link Text & Link URL separately). Standardizes storage via Markdown formatting and automatically parses it back.
- [x] **Template Deletion**: Integrated confirmation dialogs and API request handlers to support deleting obsolete templates.
- [x] **Full-Width Stacked Designer Layout**: Updated the modal layouts to ensure the controls panel occupies the full width of its column (`w-full`) and stacks the Background Settings and Layout & Overlays cards vertically.
- [x] **Elevator Pitch PM Copy**: Crafted a professional product elevator pitch and saved it to [ELEVATOR_PITCH.md](file:///Volumes/Untitled/contact-tree-membership/ELEVATOR_PITCH.md).
- [x] **Verify Build Health**: Executed `npm run build` and confirmed the project builds without errors.

### Advanced Features & Performance Optimization (Session 25)

- [x] **Resolved Infinite Request Loops (429 & Screen Flickering)**: Discovered that `getToken` reference instability and redundant `useEffect` checks in sub-screens (`MembershipAdminDashboard`, `MembershipAdminMembers`, and `MembershipAdminTemplates`) caused excessive database query floods. Removed redundant checks to let parent layout manage fetches.
- [x] **Optimized Cloudflare Usage (Class A & Class B Plans)**: Cleaned up R2 storage by automatically garbage collecting old images during updates. Added dirty state checks to reuse existing card strip images if styling/fields have not changed, reducing operations.
- [x] **Custom Template Strip Background**: Added UI selection options to templates enabling custom colors, custom image uploads (persisted to R2), or matching pass background. Mapped the canvas-based strip rendering engine to dynamically fetch, filter, and draw template background images on the fly.
- [x] **Deleted Member Dashboard Filtering**: Filtered out deleted/scrubbed member profiles from the dashboard and layout context to prevent deleted entries from skewing "TOTAL REGISTERED" and "Revoked Cards" counts.
- [x] **Verify Build Health:** Verified compilation with `npm run build` and committed all changes.

### Security & Git Cleanup (Session 24)

- [x] **Ignored *.p8 Certificate Format**: Updated `.gitignore` to block `.p8` files, ensuring APNs private keys are never committed.
- [x] **Untracked Sensitive Certificates**: Removed `apns.p8`, `signerKey.pem`, `wwdrKey.pem`, `signerCert.pem`, `wwdr.pem`, and `AppleWWDRCAG4.cer` from Git tracking.
- [x] **Configured Environment Variable Fallbacks**: Verified that the backend code successfully loads cert/key details from `APPLE_APNS_AUTH_KEY`, `WALLET_WWDR_CERT`, `WALLET_SIGNER_CERT`, and `WALLET_SIGNER_KEY` variables when local files are deleted.

### Advanced Features & Performance Optimization (Session 23)

- [x] **Multi-level Numbering System**: Added `{CLUB}`, `{TYPE}`, `{YYYY}`, `{YY}`, `{MM}`, and `{NUMBER:X}` tokens, updated membership API routes, and built a live preview config editor in [AdminMembershipClubs.tsx](file:///Volumes/Untitled/contact-tree-membership/src/components/admin/AdminMembershipClubs.tsx).
- [x] **"Member Since" Integration**: Added `member_since` to [schema.ts](file:///Volumes/Untitled/contact-tree-membership/src/db/schema.ts), mapped CSV bulk uploads/manual creation, and configured top-right Apple Wallet pass header mapping.
- [x] **Menu Transitions Cache**: Refactored [MembershipAdminLayout.tsx](file:///Volumes/Untitled/contact-tree-membership/src/components/membership/admin/MembershipAdminLayout.tsx) to cache data and share it using Outlet context, eliminating page-to-page database queries.
- [x] **Bulk Import Template Download**: Embedded CSV template generation in [MembershipAdminMembers.tsx](file:///Volumes/Untitled/contact-tree-membership/src/components/membership/admin/MembershipAdminMembers.tsx) for self-service downloads.
- [x] **Decommissioning Legacy Code**: Removed 34 unused files across components, admin panels, and api endpoints to simplify maintenance.

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
      MembershipCardCreator.tsx      ← Card designer interface with "Member Since" and dynamic strip rendering
      MembershipCardPreview.tsx      ← Real-time visual SVG preview of front and back wallet passes
      MembershipStripDesigner.tsx    ← Visual banner editor with full-width stacked cards & interactive canvas cropping
/api
  membership.ts                      ← Custom numbering system, CSV import, and PUT image garbage collection
  passes.ts                          ← Apple Wallet pass compiler & APNs push trigger endpoints
```

---

## 📁 FILES MOST RECENTLY MODIFIED

| File | Last Changed | Summary |
| --- | --- | --- |
| `src/components/membership/MembershipStripDesigner.tsx` | 2026-06-15 | Stacked controls, made cards full width, added mouse/touch drag coordinates & scroll zoom. |
| `src/components/membership/admin/MembershipAdminTemplates.tsx` | 2026-06-15 | Integrated Guided Link Builder UI inputs and template deletion trigger with cascades. |
| `src/components/membership/MembershipCardCreator.tsx` | 2026-06-15 | Unified avatar cropping math with interactive drag/zoom coords. |
| `api/passes.ts` | 2026-06-15 | Compiled backFields Markdown strings to attributed value links for Apple Wallet. |
| `api/_utils/googleWallet.ts` | 2026-06-15 | Mapped backFields Markdown strings into text module data for Google Wallet. |
| `ELEVATOR_PITCH.md` | 2026-06-15 | Created PM elevator pitch document for club digital card solutions. |

---

## ▶️ HOW TO RESUME

1. **Configure Production Credentials**: Ensure the following variables are uploaded to Vercel/production environment:
   - `APPLE_APNS_AUTH_KEY` (Contents of `apns.p8`)
   - `WALLET_WWDR_CERT` (Contents of `wwdr.pem`)
   - `WALLET_SIGNER_CERT` (Contents of `signerCert.pem`)
   - `WALLET_SIGNER_KEY` (Contents of `signerKey.pem`)
2. **Verify Build Health:** `npm run build`
3. **Launch Local Server:** `npm run dev -- --port 5173`
4. **Verify CSV Template & Import:** Check if the CSV template download matches the expected import headers.

---

## 💡 DESIGN PRINCIPLES

- **Caching over Round-Trips** — Avoid calling backend routes repeatedly on simple admin page navigation.
- **Strict Validations** — Hard rules like "max 6 templates per club" must be enforced on both client interfaces and server APIs.
- **Dynamic Configs** — Standard formatting engines (like membership serial numbers) should be flexible and predictable.
