# UPS discounted shipping — September 6, 2026

## Cause and fix

Netlify had UPS credentials and an account number, but no `UPS_ENV` setting at either site or team level. `netlify/functions/lib/ups.js` defaults to UPS's sandbox unless `UPS_ENV=production`. The local `.env` already used production, explaining why local requests returned real account discounts while website checkout returned sandbox prices.

Saved `UPS_ENV=production` in the site's production environment and published the existing source as deployment `6a9dd652e637f4d5b38932fa`. No pricing formula or account-number change was needed. Keep this Netlify setting on future deployments; putting it only in `.env` or `netlify.toml` does not configure deployed function runtime variables.

## Evidence

- UPS support confirmed the E-Commerce Pricing Agreement was effective September 3; the September 4 reply confirmed it remained associated with the account. Earlier API support findings predated activation.
- The original checkout matched UPS sandbox prices exactly across all four displayed services.
- A fresh checkout after the fix displayed the production account rates below. No payment or label purchase was made.
- All 22 tests in the previously published source passed. Public catalog/configuration requests succeeded; private shipping configuration and label endpoints returned 401 without authentication.

| Service | Before | After |
| --- | ---: | ---: |
| UPS Ground | $19.55 | $8.44 |
| UPS 3 Day Select | $40.07 | $18.21 |
| UPS 2nd Day Air | $52.61 | $23.91 |
| UPS Next Day Air | $171.90 | $78.14 |

These are one-bag quotes using the website's existing reference destination in Columbus, Ohio. They are not a promise of the same cost for every package/address. Existing Stripe Checkout sessions keep their original shipping options; start a new checkout to receive updated rates.

The branded storefront/workspace deployment `6a9dd68c3d2a4f0008f19130` was published separately during verification and inherits the saved production setting. It was not rolled back.

## Separate existing behavior

- Stripe checkout remains in test mode. This repair did not change payment credentials.
- Checkout currently rates a fixed reference destination before collecting the customer's address on Stripe. Customer-address-specific quoting is a separate change.
- Subscription shipping remains the existing flat recurring fee.

## Requested test and deployment

The current storefront/workspace build passed all 29 tests and was deployed as `6a9dd7c5dd659040a0f79f79`. Netlify confirmed it is the published, ready deployment. Published JavaScript and CSS matched the tested build; HTML differed only in Netlify's clean-URL link rewriting. Public shipping configuration returned 200; unauthenticated private shipping configuration, shipping labels, and admin workspace returned 401.

The browser flow from product options to bag to Stripe Checkout succeeded after deployment. A fresh one-bag checkout again displayed Ground $8.44, 3 Day Select $18.21, 2nd Day Air $23.91, and Next Day Air $78.14. No payment or shipping-label purchase was made. Stripe remains in test mode.
