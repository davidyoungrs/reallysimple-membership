# Reference Guide — Wallet Integrations, Storage Optimizations & Revocation Workflows

This document serves as a comprehensive reference guide summarizing how Google Pass generation, Cloudflare R2 optimizations, database deletions, and Apple Wallet updates were implemented. You can use this guide to align the original project with this repository.

---

## 1. Google Wallet Pass Integration & JWT signing

### Backend Auth & Object Sync
* **Utility File:** `api/_utils/googleWallet.ts`
* **Auth Generation:** Uses `google-auth-library` to create a scoped token generator using the `GOOGLE_WALLET_CLIENT_EMAIL` and `GOOGLE_WALLET_PRIVATE_KEY` environment credentials.
* **Metadata Patching:** The `patchGoogleWalletObject` function maps real-time generic membership card changes (like updated member names, status, or card strip images) directly to the Google Wallet REST API at:
  `https://walletobjects.googleapis.com/walletobjects/v1/genericObject/{objectId}`
* **revocation / inactivation:** Revoking a card is handled by patching the genericObject `state` field to `'inactive'`.

### Pass Generation & JWT Signing
* **API File:** `api/passes.ts` (`handleGooglePass` & `handleGoogleMembershipPass`)
* **Mechanism:** To generate a Save-to-Google-Wallet button, the backend signs a JSON Web Token (`jsonwebtoken` package) containing the claims (e.g. issuer account, Generic Class definition, Generic Object definition). This signed JWT is returned to the frontend and embedded inside the Google Pay Save button.

---

## 2. Cloudflare R2 Storage Optimizations (Class A & B)

### Class A Optimization: Dirty State Checking (Frontend)
* **Files:** `src/components/membership/MembershipCardCreator.tsx`
* **Logic:** When saving membership details, the frontend compares the current fields (`memberName`, `memberPhoto`, and strip config colors/backgrounds) with the initial loaded database state. If no values affecting the card visual layout are changed, the app skips generating the new canvas blob (`generateStripImageBlob`) and completely bypasses the `/api/membership?action=upload` API endpoint, reusing the existing `stripImageUrl`. This minimizes Class A write/upload requests.

### Class B Optimization: Automatic Garbage Collection (Backend)
* **Files:** `api/membership.ts` (PUT handler)
* **Logic:** When updating a membership record, if a member's photo or card strip image is replaced or removed, the backend extracts the key of the old R2 asset (using `new URL(url).pathname` or URL search parameters) and runs `deleteFromR2(oldKey)` in the background. This prevents abandoned image files from accumulating in the R2 bucket, keeping storage footprints clean.

---

## 3. Database Deletion, Scrubbing & Revocation

### Deletion & Personal Data Scrubbing
* **API Path:** `DELETE` in `api/membership.ts`
* **Mechanism:** To comply with privacy/retention requests while preserving database serial numbers and verification histories, member records undergo a "soft scrub":
  1. **Storage Cleanup:** Old avatar photos and strip image files are extracted and deleted from Cloudflare R2.
  2. **Data Scrubbing:** The database record is updated to overwrite personal details:
     * `memberName` set to `'Deleted Member'`
     * `memberEmail` set to `'deleted@example.com'`
     * `memberPhone`, `memberPhoto`, and `stripImageUrl` set to `null`.
     * `status` set to `'revoked'`.
  3. **Pass Syncing:** Calls `syncMembershipWallet(uid)`.

### Push Wallet Revocations
* **Apple Wallet (APNs):** Triggers `syncMembershipWallet` which queries registered device tokens in the Neon database (`walletPushRegistrations`) and pushes silent APNs notifications via `sendPassPush`. On receiving the push, the phone requests the updated pass endpoint. Because the status is `'revoked'`, the API returns a pass with `voided: true`, causing the pass to be deactivated/greyed out in the user's Apple Wallet.
* **Google Wallet:** Since the status is `'revoked'` (an inactive state), the Google Wallet sync patches the generic object's state on Google's servers to `'inactive'`, rendering the pass invalid on Android devices.

---

## 4. Apple Wallet Pass Creation Enhancements

When porting updates to the original project, look for these key changes inside the Apple Wallet compiler (`api/passes.ts`):

1. **"Member Since" Header Integration:**
   * Mapped the `memberSince` numeric field into Apple Wallet's `headerFields` (top-right slot of the pass) so it is displayed prominently.
   ```typescript
   pass.headerFields.push({
       key: 'member-since',
       label: 'Member Since',
       value: String(membership.memberSince || new Date(membership.issuedAt).getFullYear()),
   });
   ```
2. **Robust Certificate Resolution:**
   * Updated `getCertContent` to read PEM certificates synchronously from local files first (for local dev environments) and fallback to environment variables in serverless production runtimes, using regex formatting to strip quote wrappers and replace raw `\n` literals.
3. **Dynamic Geofence Notifications:**
   * Configured the pass model to query master club coordinates, cross-reference them with the selected template geofences, and attach coordinates via `pass.setLocations(...)` to trigger lockscreen notifications on approach.
4. **Interactive Avatar Cropping & Alignment (Strip Designer):**
   * Configured mouse dragging and touch gesture events directly on the `<canvas>` component inside `src/components/membership/MembershipStripDesigner.tsx` to allow real-time repositioning of the profile image avatar inside its circular frame.
   * Enabled mouse-wheel scroll events to adjust `innerScale` (zoom factor) of the avatar.
   * Introduced new JSON properties: `innerScale`, `offsetX`, and `offsetY` inside `photoConfig` in the `StripConfig` schema.
   * Integrated corresponding translate and scale canvas rendering logic in `MembershipCardCreator.tsx` to ensure that generated backend R2 png strip images perfectly match the administrator's custom preview crop.

---

## 5. Dynamic Back-of-Card Info Fields

* **Template UI Settings & Guided Link Builder:** Added a dynamic field builder to the template manager (`src/components/membership/admin/MembershipAdminTemplates.tsx`), allowing admins to add up to 8 label-value fields.
  * **UI Guided Flow:** Admins can select between **Plain Text** and **Web / Contact Link** for each field.
  * **Link Builder inputs:** When choosing **Web / Contact Link**, the UI provides separate fields for **Link Text** (e.g. `Visit Website`) and **Link URL / Address** (e.g. `https://example.com` or `mailto:info@example.com`).
  * **Markdown Serialization:** Under the hood, the UI encodes these inputs into standard Markdown `[Link Text](URL)` syntax in the JSON config, keeping the database schema untouched.
  * **Markdown Deserialization:** On load, the UI uses a regex to automatically parse any Markdown formatted value back into the separate Link Text and Link URL boxes.
* **Apple Wallet Compilation:** The pass compiler (`api/passes.ts`) reads this array. If a field matches Markdown link syntax, it compiles it into an HTML anchor tag for the `attributedValue` field (rendered as a blue clickable text link on iOS) and plain text for the `value` field.
* **Google Wallet Syncing:** The Google Wallet compiler (`api/_utils/googleWallet.ts`) extracts the fields, compiles Markdown links into a clean `Link Text: URL` plain-text fallback, and maps them as generic Text Modules, preserving link clickability on Android.

---

## 6. Template Deletion & Cascade Effects

* **UI Controls:** Added a red trash icon button next to the "Configure" button on each template card inside `src/components/membership/admin/MembershipAdminTemplates.tsx`.
* **Confirmation Warning:** Clicking the button triggers a confirmation warning explaining that deleting a template will cascadingly delete all membership cards associated with it.
* **API Handler:** Sends a `DELETE` request to `/api/membership?resource=templates&id=X`, which uses the existing Drizzle/Postgres database cascade constraint to remove the template and its dependent members cleanly.


