# Shopify order-specific reviews — staged, not published

Status: email renderer, secure invitation links, customer page, submission service,
and feature gate implemented. Shopify delivery-event ingestion, dispatch, moderation
UI, approved-review storefront display, and live email cutover are NOT connected.
Existing Shopify email and generic review form remain unchanged.

Changed files:
- `netlify/functions/lib/order-review-links.js`: 45-day signed invitation identifiers,
  product-specific 1–5 rating links, purchased-product images and variant reorder cart.
- `netlify/functions/lib/shopify-review-service.js`: private invitations and reviews,
  membership checks, duplicate protection, delivery + three-day due timestamps.
- `netlify/functions/shopify-order-reviews.js`: POST-only view and submission API.
- `order-review.html`, `assets/order-review.{js,css}`: customer comment form; selected
  product and rating prefilled. No login or order-number entry. Token is removed
  from browser history after loading and never sent to an analytics service.
- `scripts/build.cjs`: include the new page and its fingerprinted assets.
- `tests/shopify-order-reviews.test.cjs`: focused security and behavior checks.

## Remaining integration

1. Recover authenticated Shopify admin/email editor access. The connector is
   connected to Bean Bros, but this turn's browser is signed out.
2. Confirm a supported backend host and durable database. This repository holds
   a retired-checkout Netlify application, not the current Shopify theme. Do not
   deploy that application to the live Shopify domain as a shortcut.
3. Connect authenticated Shopify order and confirmed delivery data. The internal
   service's `issue(snapshot)` is deliberately NOT an open customer API. Supply
   `{id,name,email,deliveredAt,test,cancelledAt,items:[{productId,variantId,name,
   quantity,image}]}` from trusted Shopify data. Reject partial/incomplete deliveries
   until all products in the request have arrived. Do not use fulfillment/shipped
   time as delivery time. Account for cancellations/refunds before issuing requests.
4. Store a dedicated random secret of at least 32 bytes as
   `SHOPIFY_REVIEW_LINK_SECRET`. Set `SHOPIFY_REVIEWS_ENABLED=true` only after the
   integration test passes. No credentials are embedded in the repository.
5. Implement authenticated ingestion using Shopify's official backend library,
   including raw-body webhook HMAC verification and store allowlisting. Subscribe
   to delivery and cancellation events; duplicate events must not duplicate mail.
   Cancel/revoke an invitation when its source order becomes ineligible.
6. Add a dispatch/outbox step that sends only due invitations (delivery + 72 hours),
   with durable idempotency and safe handling of unknown delivery outcomes. Use the
   confirmed sender and the actual hosted review origin. Fetch Shopify images and
   the current logo from Shopify; renderer accepts HTTPS Shopify CDN assets.
   Integrate suppression/unsubscribe rules appropriate to the existing email setup.
7. Add an authenticated approval/rejection screen. The new reviews table defaults
   to pending; no auto-publishing path exists. Storefront reads must select only
   approved rows and escape customer text. Reviews must support all star ratings.
8. Test with one test order and the owner's email: correct products, all five
   buttons, mobile form, pending review, explicit approval, reorder cart, expiry,
   duplicate event, cancellation, and three-day timing. Disable the old request
   automation only at cutover so customers do not receive duplicate emails.

## Validation

- Focused Node tests pass; static production build passes.
- Full `npm test` was attempted but dependencies are absent in this checkout
  (`@electric-sql/pglite` and other installed packages). Run `npm ci`, then the full
  suite, before releasing. No production deployment performed.

Reference: https://shopify.dev/docs/apps/build/webhooks/verify-deliveries
