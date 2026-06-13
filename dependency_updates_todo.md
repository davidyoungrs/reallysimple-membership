# TODO: Core Dependency Upgrades

Use this checklist to track the updates for the outdated npm packages.

## Phase 1: Safe Minor & Patch Updates
*Run tests and verify the application builds after running `npm update`.*

- [ ] Upgrade **React & React DOM** (`19.2.4` → `19.2.7`)
- [ ] Upgrade **TailwindCSS** (`4.1.18` → `4.3.0`)
- [ ] Upgrade **Drizzle ORM & Kit** (`0.45.1` → `0.45.2`)
- [ ] Upgrade **Zod** (`4.3.6` → `4.4.3`)
- [ ] Upgrade **Resend** (`6.9.4` → `6.12.4`)
- [ ] Upgrade **AWS S3 SDK** (`3.989.0` → `3.1063.0`)
- [ ] Upgrade **Neon Serverless** (`1.0.2` → `1.1.0`)

## Phase 2: Major Infrastructure Upgrades
*Update one-by-one and verify API integration compatibility.*

- [ ] **Stripe** (`20.3.1` → `22.2.0`)
  - Check for changes in subscription retrieval or billing session options.
- [ ] **Clerk Backend** (`2.30.1` → `3.5.0`)
  - Check for changes to token verification and user client methods.
- [ ] **Vite** (`7.3.1` → `8.0.16`)
  - Ensure config compatibility and dev server starts correctly.
- [ ] **Node-APNs** (`7.1.0` → `8.1.0`)
  - Test wallet push notifications after upgrade.
- [ ] **Vcard-Creator** (`0.7.2` → `1.0.0`)
  - Verify vCard generation is unaffected.
