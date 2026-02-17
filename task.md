# Digital Wallet Card Platform Roadmap

## Phase 1: Core Foundation & Branding (Completed)
- [x] **Branding Engine**
    - [x] Logo upload & positioning
    - [x] Background options (Solid/Gradient)
    - [x] Font selection
    - [x] Text color selection
- [x] **Card Editor**
    - [x] Profile photo options (Shape, Scale, Position)
    - [x] Bio with character limit
    - [x] Social Links with Drag & Drop reordering
    - [x] Phone Numbers with Drag & Drop reordering
    - [x] Custom Links support
- [x] **Preview Experience**
    - [x] Dynamic scaling (ScaleToFit)
    - [x] Full card scrolling
    - [x] Visibility fixes
- [x] **Application Stability**
    - [x] Crash fixes (Null handling, State updates)
    - [x] Self-Healing Persistence (LocalStorage fallback)
    - [x] Project Metadata updates
    - [x] **Home Page Hero Image** (AI-generated branding asset integration)

## Phase 2: User Dashboard & Sharing (Completed)
- [x] **Dashboard UI**
    - [x] Responsive Card Grid View
    - [x] Thumbnail previews
    - [x] Management actions (Edit, Delete)
    - [x] Basic Stats (Views, Last Updated)
- [x] **Sharing Suite**
    - [x] Unique Public URLs (Slugs)
    - [x] QR Code Generator (SVG/PNG download)
    - [x] Share Menu UI
    - [x] **Email Signature Generator** (Table-based HTML, Copy-to-clipboard)
    - [x] **Analytics Internationalization** (Localized dates & labels)
    - [x] **Public Card UX Cleanup** (Removed top navigation, CTA to home, Sticky bar spacing)
    - [x] Translations for Dashboard & Share Menu
    - [x] Layout stability for long text
- [x] **Internationalization**
    - [x] Language Selector

## Phase 3: Analytics & Engagement (Completed)
- [x] **Click Tracking**
    - [x] Database Schema (`card_clicks`)
    - [x] API Endpoint (`/api/track-click`)
    - [x] Frontend tracking (Social, Contact, Custom links)
- [x] **Analytics Dashboard**
    - [x] Visual Charts (Recharts integration)
    - [x] Metric Cards (Total Views, CTR)
    - [x] Media Impressions tracking
    - [x] **Geographic Data** (IP-based location tracking & Map)
    - [x] **Data Export** (CSV/JSON download)
    - [x] **Date Range Filtering** (Custom ranges)
    - [x] **Mobile & QR Attribution**
        - [x] Schema update (source, deviceType)
        - [x] QR scan internal tracking (?src=qr)
        - [x] Device type detection (Mobile/Tablet/Desktop)
        - [x] Analytics Dashboard charts for Source/Device
    - [x] **Bug Fix**: Resolving 500 error & view count stagnation

## Phase 4: Bug Fixes & Refinement (Completed)
- [x] **Card Deletion Fix**
    - [x] Update schema with `onDelete: 'cascade'`
    - [x] Update `delete-card.ts` to handle related records
    - [x] Verify deletion with existing analytics data

## Phase 5: Onboarding & Monetization (Next Steps)
- [x] **Authentication & Onboarding**
    - [x] Clerk Auth Integration
    - [x] Landing Page
    - [x] Secure User Dashboard routes
- [ ] **Subscription System**
    - [ ] Update users schema (tier, stripe_customer_id, status)
    - [ ] Initialize Stripe billing portal logic
    - [ ] Stripe/PayPal Integration
    - [ ] Tiered Access (Free vs Pro)
    - [ ] Feature Gating (Restrict advanced backgrounds/limits)
    - [ ] Subscription Management Dashboard

## Phase 6: Wallet Integration & Dashboard Polish (Completed)
- [x] **Apple Wallet (.pkpass)**
    - [x] Pass Certificate generation & Server-side signing
    - [x] "Add to Apple Wallet" button
    - [x] Verified on actual device
- [x] **Dashboard Polish**
    - [x] Activity Feed: "Recent Activity" widget showing last 5 interactions
    - [x] Views Chart: Line chart showing "Total Views" over time
    - [x] Profile Management: Enhanced settings page for account details
    - [x] Empty States: Better illustrations for new users
- [x] **Google Wallet**
    - [x] JWT-signed link generation
    - [x] "Save to Google Pay" button
- [x] **Dashboard Visibility & UX Fixes**

## Phase 7: Lifecycle & Growth (Future)
> [!IMPORTANT]
> **Vercel Pro Plan Required**: This phase and subsequent complex backend features exceed the 12-function limit of the Vercel Hobby plan.
- [ ] **Engagement Tools** <!-- id: 13 -->
    - [ ] Database Schema for Leads (`leads` table)
    - [ ] Lead Capture Form on cards (`LeadForm.tsx`)
    - [ ] Lead submission API (`/api/leads/submit`)
    - [ ] Save Leads to Dashboard
    - [ ] Leads management view in Dashboard (`LeadsManager.tsx`)
    - [ ] "Exchange Contact" feature (Two-way lead submission)
    - [ ] CSV export for leads
- [ ] **Notifications**
    - [ ] Push Notifications for card updates
    - [ ] Expiration reminders for subscriptions

## Phase 8: Security & Privacy (Completed)
- [x] **API Security**
    - [x] Rate Limiting (API endpoints, view tracking)
    - [x] CSRF Protection (Origin/Referer validation)
    - [x] Input Sanitization & XSS Prevention (Lead notes, bios)
    - [x] CONTENT SECURITY POLICY (CSP) headers
- [ ] **Growth Polish**
    - [ ] Generate dynamic OpenGraph (OG) images for each card slug

## Phase 11: Wallet Experience & Builder (Completed)
- [x] **Asset Generation**
    - [x] Generate professional `strip` image for Apple Wallet
- [x] **Wallet Card Builder UI**
    - [x] Create `WalletBuilder.tsx` component
    - [x] Add Wallet settings to main editor
    - [x] Live preview for Wallet pass layout
- [x] **Backend Integration**
    - [x] Support dynamic strip images in `api/generate-pass.ts`
    - [x] Store Wallet-specific customization in database
    - [x] Drag & Drop Wallet Logo upload

## Phase 9: Policies & Compliance (Completed)
- [x] **Policy Updates** (Privacy, Terms, and Cookies)
    - [x] Privacy Policy implementation
    - [x] Terms and Conditions implementation
    - [x] Cookies Policy implementation

## Phase 12: Visual Refresh & Dashboard UX (Completed)
- [x] **UI Refinement**
    - [x] New Color Palettes integration
    - [x] Template defaults update (Sarah Jenkins)
    - [x] Dashboard Preview Centering & Size optimization
    - [x] Email Signature Modal full-width layout optimization
    - [x] /bug: Fix Email Signature Modal flickering/positioning (Portal implementation)
- [x] **Analytics & Maps Fixes**
    - [x] Fix Map visibility by updating CSP in `vercel.json`
    - [x] Add social icons to Analytics Dashboard (Interactions, Sources, Devices)
- [ ] **Phase 13: Admin Super Dashboard** <!-- id: 160 -->
    - [ ] Set up RBAC & Protected `/admin` layout <!-- id: 161 -->
    - [ ] Build Global Analytics Dashboard (Aggregate Views/Clicks) <!-- id: 162 -->
    - [ ] Create User Management Directory (Search/Status/Lifecycle) <!-- id: 163 -->
    - [ ] Create Card Management Gallery (Audit/Moderation) <!-- id: 164 -->
    - [ ] Build Security & API Monitoring Panel <!-- id: 165 -->
    - [ ] Implement System-Wide Configuration Toggles <!-- id: 167 -->
