# TODO: Outstanding Tasks & Issues

- [ ] **Apple Wallet Strip Photo Clipping**: The circular member avatar image on the Apple Wallet pass strip image is still being cut off on the left on actual iOS device screens. Needs further coordinates/scaling adjustment (e.g. moving `x` center coordinate further to the right, or shrinking the photo size scale further) to clear the Apple Wallet card's dynamic corner radius and margin masks.

## 💳 Wallet & Pass Enhancements
- [ ] **Dynamic Back-of-Card Info Fields**: Allow admins to define dynamic rich text on the back of the Apple Wallet pass (e.g., terms of use, club benefits, or contact info) that can be updated in real-time.
- [ ] **Save to Google Wallet Integration**: Fully map the newly designed membership templates and fields (including the "Member Since" slot and custom number formats) to Google Wallet passes.
- [ ] **Geofenced Notifications**: Enable lock-screen card alerts by attaching GPS coordinates or beacon IDs to passes.

## 📧 Automated Updates & Notifications
- [ ] **Triggered Push Broadcasts**: Build a dashboard UI to send bulk push notifications to all members of a specific club, or targets of a specific membership level.
- [ ] **Welcome & Renewal Email Sequences**: Automatically trigger an email with pass installation links (`.pkpass` download) upon CSV upload or card issuance, including expiry alerts 30 days before lapse.

## 📊 Dashboard Analytics & Monitoring
- [ ] **Pass Install & Active Tracking**: Provide analytics showing how many issued passes are active in Apple Wallet vs. how many have been deleted or never downloaded.
- [ ] **Membership Tier Analytics**: Visual charts (via Recharts) showing members registered over time, breakdown by tier/type, and retention metrics.

