# TODO: Outstanding Tasks & Issues

## 💳 Wallet & Pass Enhancements
- [x] **Dynamic Back-of-Card Info Fields**: Allow admins to define dynamic rich text on the back of the Apple Wallet pass (e.g., terms of use, club benefits, or contact info) that can be updated in real-time.
- [x] **Save to Google Wallet Integration**: Fully map the newly designed membership templates and fields (including the "Member Since" slot and custom number formats) to Google Wallet passes.
- [x] **Geofenced Notifications**: Enable lock-screen card alerts by attaching GPS coordinates or beacon IDs to passes.

## 📧 Automated Updates & Notifications
- [ ] **Triggered Push Broadcasts**: Build a dashboard UI to send bulk push notifications to all members of a specific club, or targets of a specific membership level.
- [ ] **Welcome & Renewal Email Sequences**: Automatically trigger an email with pass installation links (`.pkpass` download) upon CSV upload or card issuance, including expiry alerts 30 days before lapse.

## 📊 Dashboard Analytics & Monitoring
- [ ] **Pass Install & Active Tracking**: Provide analytics showing how many issued passes are active in Apple Wallet vs. how many have been deleted or never downloaded.
- [ ] **Membership Tier Analytics**: Visual charts (via Recharts) showing members registered over time, breakdown by tier/type, and retention metrics.

## 🛡️ Security & Role Governance
- [x] **Super User Admin Panel**: Implement dedicated privilege manager console to manage clerk roles and geofenced club assignments.
- [x] **Application-Wide Tooltips**: Deploy lightweight `<Tooltip />` wrapper triggers across all main dashboards, fields, and controls.
- [ ] **Dynamic QR Code Barcodes**: Support rotating barcodes to prevent screenshot-sharing fraud.
- [ ] **Pass Validation Scanner**: Create camera-based scan page at `/scan` for receptionist verification.


