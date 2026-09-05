# Priority security and checkout fixes — September 5, 2026

Implemented locally. This change has not been deployed, and no live payments, emails, shipments, subscriptions or database records were changed during testing.

## Changes

- Account tokens now identify a database account and session version. Orders, billing, subscriptions and delivery-address updates require a verified email. Existing accounts must verify once; old tokens require a fresh login. Password changes and signing out revoke earlier account sessions. Verification codes expire after 15 minutes, allow five attempts and cannot be reused. Sending codes and account/admin sign-in are rate limited.
- Shipping labels are served only through an authenticated admin endpoint, with private/no-store responses. New labels use a separate private store. The public image endpoint permits product images only. Packing slips escape customer-provided text.
- Cancelling the final coffee cancels its entire subscription, including recurring shipping. Shipping no longer appears as a separately manageable coffee. Cadence changes keep all coffees, quantities and shipping on the same schedule, with explicit customer confirmation. Verified account checkouts reuse a stored Stripe customer.
- Checkout redirect hosts are matched exactly. The success URL puts the Stripe session ID before the URL fragment. The receipt requires a browser-held receipt proof and checks payment status with Stripe, then shows the actual charge and saved order ID. Opening the success route alone no longer claims payment succeeded. Cart contents survive reloads in the same tab.
- Orders record the shipping service purchased; label creation honors that service and apartment/suite information. Older orders recover their service from Stripe where possible. Unknown services stop label creation instead of silently using Ground.
- An order and its stock decrement commit in the same transaction. Failed stock writes roll back the order so webhook retries can recover. Duplicate webhooks do not decrement stock again. Subscription invoice fulfillment can recover the Checkout address when Stripe delivers events out of order. Unpaid checkout events do not produce paid orders.
- Product IDs use BIGINT to support the existing editor's timestamp IDs. Invalid quantities and duplicate cart lines are checked against the catalog, and price is determined by the server.
- Netlify publishes an explicit static allowlist from `dist`, rather than the repository root. Backend files, migrations, credentials, tests and documentation are excluded. The build generates new asset filenames when content changes.
- The vulnerable `qs` dependency was updated to its compatible patched version.

## Validation

`npm run build`, `npm test`, JavaScript syntax checks and `git diff --check` pass. Tests use an isolated in-memory PostgreSQL database (PGlite) for real migration, authentication, verification, rate-limit, rollback and idempotency checks. Stripe, email and UPS interactions use test doubles; no provider sandbox or production transactions were performed. `npm audit fix --ignore-scripts` reported zero known vulnerabilities after the dependency update.

Browser checks used a localhost-only server with simulated API responses: missing-proof receipt, sign-in, verification, verified account access, adding coffee to cart, checkout redirect, confirmed receipt and clearing the purchased cart. This verifies the frontend flow but does not substitute for a provider-integrated staging checkout.

## Rollout requirements

1. Confirm a current database backup and working production configuration for `ACCOUNT_TOKEN_SECRET`, the database, Stripe and UPS. Confirm `BREVO_API_KEY` and the verified Brevo sender `hello@beanbrosbrewingco.com`. Email verification fails closed if email is unavailable, so this must work before customer access is switched over.
2. Apply `netlify/database/migrations/20260905160000_security_and_fulfillment.sql` through the site's migration mechanism before the updated functions receive traffic. It adds account fields and the rate-limit table and widens product IDs; it does not delete account/order data or mark existing accounts verified.
3. Publish the updated functions and the `dist` build together. Verify the Netlify publish directory is `dist`, including any dashboard override. Check that `/netlify/functions/lib/accounts.js` no longer returns source and that public `image?key=label-...` requests cannot retrieve labels. Check authenticated label printing still works for an existing label.
4. Purge the site's CDN cache for old label/image URLs and the earlier exposed source paths. Already downloaded browser copies cannot be recalled. Old published deploy URLs may remain accessible and require a separate Netlify deployment-retention review.
5. Run a provider-integrated staging check for verification delivery, guest payment, subscription payment, receipt, webhook fulfillment, expedited shipping metadata, cancellation and logout revocation. Preview hostnames require an explicit trusted-origin configuration; arbitrary preview domains are intentionally not accepted as payment redirects.

## Operational limits and remaining audit work

- This does not repair historic shipping-only subscriptions, missing addresses, incorrect stock, duplicate Stripe customers or labels previously downloaded publicly. Review affected records before changing billing or fulfillment.
- A label attempt is claimed atomically and is not automatically retried after an uncertain UPS response. If an attempt stalls, check UPS first; recover its shipment/tracking details or explicitly clear the order's `labelCreationStartedAt` only after confirming no shipment was purchased. This intentionally needs operator reconciliation to avoid duplicate label charges.
- Inventory is still not reserved while a customer is in Stripe Checkout. Concurrent purchases can oversell, and whole-catalog admin saves can overwrite intervening stock changes. Those need a separate inventory workflow change.
- The broader UI redesign, source-project reconstruction, remaining accessibility work, hardcoded free-shipping promotion, historical customer consolidation, complete backup coverage, admin MFA and transactional order emails remain follow-up work from the audit.
- Rolling back the app would reintroduce the reported vulnerabilities. The migration is additive apart from widening the product ID, so retain it and prefer a forward fix.
