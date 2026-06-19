# Platform Update Log

This document tracks all recent feature updates, architectural improvements, and security enhancements implemented on the platform.

---

## 🚀 Recent Updates

### 1. Email-Based Club Admin Pre-Authorization
* **Feature**: Super Users can assign club admin rights to email addresses before the user registers a Clerk account.
* **Database**: Altered the `club_admins` table to make `clerk_id` nullable and added a text-based `email` column.
* **Sync Logic**: Added auto-linking middleware that binds any pending email assignments to the user's `clerkId` on their first successful sign-in.
* **JWT Caching Latency Fix**: Integrated dynamic role checks in `AdminLayout.tsx` that hit `/api/membership?action=sync_role` to check database linkages on login, bypassing Clerk's local session JWT refresh delays to prevent "Access Denied" screens on first login.
* **UI**: Super Users can input standard email addresses or Clerk IDs when configuring clubs, and pending users show a `(Pending)` badge.

### 2. Multi-Environment Staging Workflow (`development` branch)
* **Setup**: Configured a `development` branch on GitHub tracking `origin/development`.
* **Workflow**: Everyday edits go to `development` (building to Vercel Preview), while production deployments are compiled by merging `development` to `main`.
* **Security**: Isolated Clerk sandbox and test database connections to Staging/Preview scopes.

### 3. Visual Drag-and-Drop Reordering
* **Feature**: Admins can visually reorder club cards on the dashboard via drag-and-drop.
* **Database**: Added a persistent `sort_order` column to the `clubs` table.
* **UI**: Integrated `@dnd-kit/core` and `@dnd-kit/sortable` with a dedicated drag handle to prevent conflict with other action buttons.

### 4. Super User Dashboard & Access Gating
* **Console**: Built a `/admin/superuser` role management console for delegating and revoking platform privileges.
* **Security**: Added token-level role validation on both client and API endpoints. 
* **Fallback**: Unauthorized users attempting manual URL entries are redirected to a dedicated `/admin/no-access` page.
* **Edit Controls**: Safely restored the "Edit Branding" button for standard admins for their assigned clubs.
