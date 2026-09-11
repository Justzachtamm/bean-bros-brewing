# Promo codes — ready for release

Customers enter an optional code in the bag. Stripe confirms and applies the discount before payment. Codes apply to one-time purchases only; subscriptions retain Subscribe & Save. Shipping is excluded from discounts and the free-shipping threshold uses the pre-promo items subtotal.

Admin → Promo codes supports percent or USD discounts, optional expiration and total redemption limits, paginated listing, and deactivation. Creation uses Stripe idempotency keys so retries of an unchanged form do not create duplicate codes. Codes use the configured Stripe account and test/live mode.

Changed: index.html, assets/storefront.js, admin.html, assets/workspace.js; added assets/admin-promos.js and netlify/functions/admin-promos.js; updated netlify/functions/create-checkout-session.js; added tests/promos.test.cjs.

Validation: all 87 tests passed; production build passed; admin script syntax checks passed. Stripe API calls were mocked in tests; no live promotion was created or redeemed. Not deployed. Release with the next authorized batch, then verify admin creation and customer discount display using the appropriate Stripe environment.
