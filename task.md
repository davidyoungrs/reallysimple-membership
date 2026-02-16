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
- [/] **Authentication & Onboarding**
    - [x] Clerk Auth Integration
    - [x] Landing Page
    - [x] Secure User Dashboard routes (Refinement)
- [ ] **Subscription System**
    - [ ] Stripe/PayPal Integration
    - [ ] Tiered Access (Free vs Pro)
    - [ ] Card Limit enforcement
    - [ ] Subscription Management Dashboard

## Phase 6: Wallet Integration & Dashboard Polish (Current Focus)
- [x] **Apple Wallet (.pkpass)**
    - [x] Pass Certificate generation & Server-side signing
    - [x] "Add to Apple Wallet" button
    - [x] Verified on actual device
- [x] **Dashboard Polish**
    - [x] Activity Feed: "Recent Activity" widget showing last 5 interactions
    - [x] Views Chart: Line chart showing "Total Views" over time
    - [x] Profile Management: Enhanced settings page for account details
    - [x] Empty States: Better illustrations for new users
- [-] **Google Wallet (Parked)**
    - [-] JWT-signed link generation
    - [-] "Save to Google Pay" button

## Phase 7: Lifecycle & Growth (Future)
- [ ] **Engagement Tools**
    - [ ] Lead Capture Form on cards
    - [ ] "Exchange Contact" feature
    - [ ] Save Leads to Dashboard
- [ ] **Notifications**
    - [ ] Push Notifications for card updates
    - [ ] Expiration reminders for subscriptions

## Phase 8: Security & Privacy (Future)
- [ ] **API Security**
    - [ ] Rate Limiting (API endpoints, view tracking)
    - [ ] CSRF Protection tokens
    - [ ] Input Sanitization & XSS Prevention
    - [ ] Content Security Policy (CSP) headers

## Phase 9: Policies & Compliance (Current)
- [ ] **Policy Updates** (Review and refine Privacy, Terms, and Cookies)
    - [ ] Update Privacy Policy
    - [ ] Update Terms and Conditions
    - [ ] Update Cookies Policy
- [x] **Initial Policies Implementation**
