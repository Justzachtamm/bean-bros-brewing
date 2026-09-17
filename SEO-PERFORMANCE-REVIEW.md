# SEO and performance batch — September 17, 2026

**Release authorized September 17, 2026.** This report records the completed pre-release checks; the batch is integrated into the saved project and ready for the authorized Git-triggered production release. This is a pre-release evidence snapshot; deployment completion is reported separately. Worktree: `/Users/zachtammous/.codex/worktrees/4e5c/live` (detached HEAD). The pre-existing `output/` creative exports are preserved and now excluded from Git so they do not clutter Changes or enter the release. Authorization to push and deploy was given; release this as one batch; publish `dist`, never the repository root.

## Requested scope

| Request | Outcome and evidence |
| --- | --- |
| XML sitemap | Existing dynamic sitemap retained; added `/collections/`. Active catalog snapshot has 36 products and 7 public static/catalog routes: 43 URLs. Static fallback also includes shop and collections. No invented modification dates. |
| robots.txt | Existing allow rules and correct HTTPS sitemap reference verified. Product images remain allowed; private API paths remain excluded from crawling. |
| Remove noindex | Removed the stale exclusion from the public collections landing page. It now opens accessories by default instead of immediately redirecting visitors to the homepage. Historical `#tea` links still reach the live herb shop. Admin/account and genuine error pages remain noindex; checkout is a dialog on the canonical homepage, not a separate indexable route. |
| Canonical tags | One canonical on each of the 43 checked public pages. Existing product IDs/slugs and policy URLs retained. Added slash/legacy-collection redirects; renamed product slugs still redirect to the current product URL. |
| Titles/descriptions | Unique, nonempty titles and descriptions across all 43 pages. Completed collections metadata and dynamic catalog social metadata; existing valid policy metadata retained. |
| H1 and hierarchy | One H1 on all checked public pages; no skipped levels in their static visible heading outlines. Subscription steps now nest under the dialog heading, with products below the steps. Five page types also had one rendered H1 at four viewport widths. |
| Image alt text | Checked static/generated images for alt attributes. Product alt text uses actual product names, and the OG alt describes the visible logo. Decorative images intentionally keep empty alt text. Added layout dimensions and asynchronous decoding. |
| Schema | Preserved live-catalog Product/Offer prices and availability, organization/site schema, and safe JSON escaping. Added product BreadcrumbList and catalog/collections CollectionPage markup. Lucky Star and the travel mug now have actual product images in schema/feed; no invented ratings, certifications, GTINs or medical claims. Local JSON parsing and catalog consistency checks pass; Google rich-result eligibility is not guaranteed. |
| Internal/broken links | Coffee and herb titles link directly to canonical product pages. Added crawlable catalog fallbacks and a real shipping-policy footer link. 197 unique internal page/resource/fragment targets checked, with no missing targets; inspected eight built CSS files, with no local URL references. Checked live public page destinations and external W3C/Whatnot links. |
| Image compression | Created 53 WebP derivatives: **58,856,339 → 4,295,968 bytes (92.7% less)** across the source set, not a per-page transfer claim. Originals remain intact. Travel mug: 1,961,608 → 119,426 bytes; live House Blend image: 2,169,201 → 209,596 bytes. Reproduce with `npm run optimize:images`. |
| Core Web Vitals work | Reduced image bytes, reserved image space, retained deferred scripts/lazy below-fold images, prioritized visible catalog imagery, and fingerprinted collection JS/CSS. Content-hashed application assets opt into immutable caching; stable files retain revalidation. Local rendering observations below are not field CWV. |
| Mobile responsiveness | Homepage, collections, shop, Lucky Star product and shipping policy checked at 320, 390, 768 and 1440 px: no horizontal document overflow, one H1 each, no failed loaded images. Adjusted collection image sizing and mobile navigation/filter touch targets. |
| HTTPS | Live HTTP and www URLs both resolve to the HTTPS apex host, which sends HSTS. Added explicit production-host redirects, retained existing HTTPS CSP policy, and included HSTS in dynamic SEO responses. Preview hosts are not redirected to production. |
| Clean URL slugs | Existing descriptive lowercase hyphenated product URLs preserved; public links now avoid the old ID-only redirect hop. Existing `.html` policy URLs were retained to avoid unnecessary migration. |
| OG image | Existing 1200×630 logo artwork visually inspected and retained. Homepage and collections include its dimensions; every checked public page has social image/title/description metadata. |
| Search Console | Authenticated live property settings explicitly show **“You are a verified owner”** for `sc-domain:beanbrosbrewingco.com`. No new token or DNS change is needed. Sitemap status is **Success**, submitted Sep 7, last read Sep 16, **42 discovered pages** before this release. |
| Backlink strategy | [BACKLINK-STRATEGY.md](BACKLINK-STRATEGY.md) contains a practical 30-day plan: owned profiles, eligible Paramus directories, local editorial coverage, genuine partners and an original brewing resource. No outreach, directory submissions or purchases performed. |

## Validation

- `npm run build`: pass; explicit publish allowlist preserved, including generated image/collection assets.
- `npm test`: **153 passed, 0 failed**. Covers commerce/payment behavior, catalog escaping/current offers, canonical redirects, new image mappings, metadata and tracking exclusions. The test loader now supports JSON modules used by the image manifest.
- `npm run check:seo -- /tmp/bean-bros-seo-products.json`: **43 pages / 36 active products / 197 internal targets, zero errors**. Input was freshly fetched from the public product API on September 17, not a synthetic production catalog. The command also works without an argument for the six static public pages. The temporary catalog is not bundled or committed; fetch a fresh snapshot for a later check.
- `git diff --check`: pass. JavaScript syntax checks passed for modified scripts.
- Live baseline: 49 public URL requests, including all 42 currently served sitemap page routes, collections, robots, sitemap, redirects and two outbound links. All first-party targets and W3C returned 200 after redirects. Whatnot returned 403 to the automated fetch, but its existing review URL opened successfully in the authenticated browser. No link was falsely declared broken because of that bot restriction.
- Local shopping check: choose House Blend → add one item → **$19.99** bag subtotal → open checkout. Escape closes checkout and releases scroll lock; “Back to bag” preserves the item. Local preview rejected payment requests, so this is **not** a paid end-to-end checkout test. Existing payment regression tests passed.
- Representative original/optimized coffee artwork and the OG logo were visually inspected; mobile homepage, collections and Lucky Star product views were inspected. No artwork was regenerated.

### Local rendering observations

390×844 desktop-browser viewport, localhost, warm cache, no CPU/network throttling, real public product/accessory snapshots, locally cached images, payment POSTs disabled. Temporary preview-only PerformanceObserver instrumentation did not enter the source or build.

| Page | Observed LCP | Observed CLS |
| --- | ---: | ---: |
| Homepage | 68 ms | 0.0001 |
| Collections | 72 ms | 0.0430 |
| Shop | 100 ms | 0 |
| Lucky Star | 56 ms | 0 |

These are short local lab observations, not a Lighthouse score, controlled before/after experiment, mobile-device benchmark, full-session CLS result or INP measurement. They do not prove live Core Web Vitals pass. Search Console currently shows **no mobile or desktop field CWV data**. [Core Web Vitals documentation](https://web.dev/articles/vitals) describes the field metrics and thresholds.

## Current indexing and release requirements

Search Console's Pages report, last updated September 13, shows **1 indexed / 44 not indexed**: **41 discovered, currently not indexed**, and **3 pages with redirects**. That report does not identify a noindex problem as the cause of those 41 pages. Google controls crawl/index timing; this batch cannot promise rankings or universal indexing.

1. Integrate the reviewed worktree changes into the saved project/release branch, preserving any newer work there. Integration into the saved project is complete with no conflicting tracked changes.
2. Make one authorized production release using the existing `npm run build` → `dist` workflow. If Git triggers deployment, do not also deploy with the CLI.
3. After deployment, check the homepage, `/collections/`, `/shop/`, a product, `/sitemap.xml`, redirects, and one generated bundle's immutable cache header. Confirm private noindex exclusions remain. Netlify routing/header behavior cannot be fully proven by the lightweight localhost preview.
4. Open Search Console's existing sitemap entry and inspect the newly indexable collections URL after release. It should discover 43 URLs if the active catalog is unchanged. Request indexing only for key changed URLs; no new property verification is required.
5. Run Google's [Rich Results Test](https://search.google.com/test/rich-results) against a deployed product page and review available field CWV when Google has enough data. No Google-rich-result test of the unpublished batch was claimed.
6. Execute backlink outreach only after separately authorizing the actual messages/listings and confirming contact details and eligibility.

## Main changed files

- Public UI/metadata: `index.html`, `collections/index.html`, `collections/app.js`, `collections/style.css`, `assets/storefront.js`, `assets/storefront.css`, `assets/accessories.js`; OG alt corrections on the four policy pages.
- Crawl/rendering: `_redirects`, `sitemap.xml`, `netlify/functions/seo-catalog.js`, `netlify/functions/lib/seo-catalog.js`, `netlify.toml`.
- Build/images: `scripts/build.cjs`, `scripts/optimize-images.cjs`, `assets/optimized-images.js`, both image manifests in `netlify/functions/lib`, 53 `*-web.webp` derivatives, and the preserved public House Blend source under `source-images/` (excluded from publish output). Sharp is a development dependency.
- Checks/docs: `scripts/check-seo.cjs`, three affected test files, `package.json`/lockfile, this report, `SEO-SETUP.md`, `BACKLINK-STRATEGY.md`.

The six uploaded coffee aliases refer only to exact immutable image keys. Five source uploads were pixel-identical to repository artwork; the distinct House Blend upload was preserved separately before compression. New image keys continue to use the existing live image service, preventing a future product photo from being replaced with an old optimized image.

References: [Google robots guidance](https://developers.google.com/search/docs/crawling-indexing/robots/intro), [Product schema](https://developers.google.com/search/docs/appearance/structured-data/product-snippet), [Netlify headers](https://docs.netlify.com/manage/routing/headers/), [Netlify redirect options](https://docs.netlify.com/manage/routing/redirects/redirect-options/). Retaining noindex on private pages is intentional: robots.txt is a crawl-control file, not an access-control or reliable deindexing mechanism.
