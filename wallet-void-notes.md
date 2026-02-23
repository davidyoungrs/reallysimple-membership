# Wallet Pass Voiding Debug

- [x] Debug Vercel dynamic folder 405 Method Not Allowed error on the Edge runtime using explicit route arrays.
- [x] Fix Apple webhook parameter processing using `api/apple-webhook.ts` centralized routing and robust JSON parsing.
- [x] Resolve `neonDbError: 42P10` 500 Internal Server error during `onConflict` update by adding `uniqueRegistration` constraint to Drizzle schema `wallet_push_registrations`.
- [x] Update generated `webServiceURL` host configuration in `api/passes.ts` to target `reallysimple-new.vercel.app`.
- [x] Refactor Apple pass creation buffer generation in `api/passes.ts` to seamlessly intercept webhook HTTP 307 redirects natively.
- [x] Rebuild `api/_utils/apns.ts` client logic utilizing strictly serialized Node HTTP/2 providers to bypass Vercel socket dropouts.
- [x] Rewrite Apple webhook registration logic to faithfully return live `updatedAt` database timestamps on Apple `GET` validation.
- [x] Overhaul `tier-limits.ts` logic to correctly enforce raw `.currentPeriodEnd` lapse timestamps over lingering `active` string tiers.
- [x] Eliminate `Promise.all()` parallel execution crashes in the admin push simulator by orchestrating requests iteratively.
- [ ] **NEXT SESSION**: iPhone successfully pings `GET /api/v1/devices/...` and Vercel replies correctly with bumped timestamp strings, but the iPhone STILL refuses to execute `GET /api/v1/passes/...`, meaning Apple Wallet strictly hates some metadata on the pass or database. 
- [ ] Determine if Apple strictly mandates `lastUpdated` timestamp strings to be identically formatted (e.g., stripping milliseconds or requiring `UTC`).
- [ ] Verify if deleting the pass from the wallet entirely and completely reinstalling a fresh `.pkpass` bundle clears any latent device caching issues preventing the visual update from sticking.
