# Bean Bros SEO and measurement

Updated September 7, 2026. Published to https://beanbrosbrewingco.com on Netlify, deployment 6a9f55b1610f2e0b49054397.

## Configuration and account status

- Google Analytics property: Bean Bros Brewing Co. — Website, property ID 553088717.
- Google web stream: Bean Bros Website, stream ID 15736461839.
- Google Analytics verified receiving traffic: its live activity card showed one active user after the consented storefront check.
- Measurement ID: G-MZQ2VHWXE9. Saved in production Netlify as GOOGLE_ANALYTICS_ID and included in the deployment.
- Search Console: the domain beanbrosbrewingco.com is already verified under the business Google account. No additional verification token is required for this domain property. Sitemap submitted and processed successfully on September 7; Google discovered 41 URLs.
- Meta: Bean Bros pixel 1390762979137251 is configured in production. Events Manager confirmed processed browser PageView, View content, and Add to cart events from the live site. Automatic Advanced Matching remains off. Server Conversions API token is still pending.
- Google server-side purchases: the user-added GOOGLE_ANALYTICS_API_SECRET is present in production Functions scope. Google validation-only Measurement Protocol endpoint returned HTTP 200 with no validation messages. This validates the payload; it does not prove a real purchase was recorded or authenticate the secret end to end.
- TikTok: business login remains required. No pixel or API token has been retrieved.
- Google Merchant Center: Bean Bros account 5849987318 has the live product-feed URL added with daily retrieval. Setup advanced to shipping, with four of six tasks complete. Shipping and returns configuration and product approval remain pending.

## Website improvements

- Search titles, descriptions, canonical URLs, social sharing metadata and homepage organization/site structured data.
- 35 active products have individual server-rendered pages, with current descriptions, prices, availability, product images and Product/Offer structured data.
- Product pages and the shop index read the production catalog on every request. Product names changing produces a canonical redirect. Inactive/missing products return 404; database failures return 503 rather than a misleading empty catalog.
- The shop index is linked from the homepage. Individual product links open a crawlable page, and Choose options returns to the correct product's shopping dialog.
- The dynamic sitemap contains the public pages and active products.
- A live RSS/XML product feed is provided for Google, Meta and compatible TikTok catalog import workflows. It has stable product IDs shared with measurement events. Stock and prices use the same catalog as the website. Products without an actual product image are excluded. GTINs and manufacturer identifiers are not invented.
- Unknown paths return real 404 responses. Admin/account and unfinished collection previews remain noindex.

## Public URLs

- Shop: https://beanbrosbrewingco.com/shop/
- Example product: https://beanbrosbrewingco.com/products/7/bean-bros-house-blend/
- Sitemap: https://beanbrosbrewingco.com/sitemap.xml
- Product feed: https://beanbrosbrewingco.com/feeds/products.xml

The feed is submitted to Google Merchant Center. Meta and TikTok catalog imports remain to be configured in their corresponding merchant/catalog accounts. Set country/currency to United States/USD. Set shipping and returns from the actual published store policy; account approval and product eligibility are determined by each platform. The feed does not create ad campaigns or authorize ad spend.

## Consent and purchase reporting

Optional browser tags load only after opt-in. Analytics and advertising have separate choices; Global Privacy Control suppresses advertising. Account/admin screens have no marketing scripts. Custom events include products, quantities and values, not customer names, email, payment credentials or addresses.

The checkout saves permitted browser identifiers and consent choices into Stripe session metadata. Only signed Stripe webhook events confirming a live, completed, paid Checkout can queue purchase reporting. Pending, unpaid and test-mode transactions are excluded. The event uses verified line-item amounts after discounts and excludes shipping/tax from merchandise value. Google receives separate shipping and tax fields.

The measurement queue has a unique transaction/platform key, stable downstream transaction/event IDs, bounded retries and a five-minute scheduled dispatcher. Sent and expired payloads are cleared. Reporting cannot require a return-page visit, so customers who close the Stripe tab can still be measured. Initial subscription purchases are reported once; recurring renewals are intentionally not misclassified as new acquisition purchases.

Server purchase delivery only activates for configured platforms with valid identifiers and checkout consent:

| Netlify variable | Purpose |
| --- | --- |
| GOOGLE_ANALYTICS_ID | Public GA4 measurement ID (configured) |
| GOOGLE_ANALYTICS_API_SECRET | Server-only Measurement Protocol secret (configured) |
| META_PIXEL_ID | Public Meta pixel ID (configured) |
| META_CONVERSIONS_ACCESS_TOKEN | Server-only Meta Conversions API access token (pending) |
| TIKTOK_PIXEL_ID | Public TikTok pixel code (pending) |
| TIKTOK_EVENTS_ACCESS_TOKEN | Server-only TikTok Events API access token (pending) |

Only public identifiers enter browser configuration. Keep server secrets in Netlify; never paste them into source or chat. Existing Google enhanced measurement remains enabled. Review Google's data-redaction settings when adding forms or URL parameters; never send personal data in analytics parameters.

## Validation

- 78 tests pass, including catalog escaping/live offers, rewritten Netlify routing, active-only indexing, consent separation, paid-only production conversions and replay-safe queue insertion.
- Preview HTTP checks passed for homepage, shop, product, sitemap, feed and a genuine 404.
- Browser checked the catalog layout, consent rejection, product page, and correct product-options dialog.
- Final production checks passed for all 41 sitemap URLs. All 35 product pages and feed entries matched current catalog prices and stock availability. Missing pages/products returned 404, private pages remained noindex, and invalid receipt requests and unsigned webhooks were rejected.
- Live browser product selection and add-to-bag showed the correct $19.99 total. The test item was removed and the bag restored to zero. Meta confirmed all three browser events were processed. No purchase was placed.
- Corrected the old customer-care migration number and rebuilt Netlify’s migration package; deployed with no destructive database changes.
- Local Stripe credentials were rejected (401) when inspecting webhook subscriptions; no customer records or payment settings were accessed. Confirm the production Stripe endpoint subscribes to checkout.session.completed and checkout.session.async_payment_succeeded before calling server delivery verified.
- Real paid end-to-end purchase delivery remains unverified. Google is configured; Meta server delivery and TikTok require remaining credentials. Google indexing and merchant approval require platform processing time.

References: [Google product data specification](https://support.google.com/merchants/answer/7052112), [Google organization markup](https://developers.google.com/search/docs/appearance/structured-data/organization), [Google consent mode](https://developers.google.com/tag-platform/security/guides/consent), [Google Measurement Protocol validation](https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events), [Meta Pixel setup](https://developers.facebook.com/docs/meta-pixel/get-started/), [TikTok Pixel](https://ads.tiktok.com/resources/help/article/tiktok-pixel?lang=en-GB).
