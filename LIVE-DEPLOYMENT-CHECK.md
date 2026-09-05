# Live deployment check — September 5, 2026

Site: https://beanbrosbrewingco.com
Published deployment: `6a9c416f6bc60200086ac39a` (September 5, 2026, 16:22 UTC).

## Result: deployed correctly, but email verification is blocked

**Action required:** `BREVO_API_KEY` is absent from both the site's and team's production function configuration. The verification handler requires it. Configure Brevo with the verified sender `hello@beanbrosbrewingco.com`, add the API key securely in Netlify for production/functions, and redeploy. Until then, customers cannot complete verification; protected account features and subscription checkout are blocked for unverified users. No verification emails were sent during this check.

A separate content issue remains: the homepage advertises free shipping at **$40**, but the live configuration is **$50**.

## Passed on the live site

- Published JavaScript and CSS match the tested local build byte-for-byte.
- Backend source, package files, local environment file and remediation notes are not publicly served. Those paths return the storefront fallback rather than file contents.
- Public label-image requests are rejected; the private label endpoint requires authentication and sends private/no-store cache headers.
- Account, order, subscription, billing and verification endpoints reject unauthenticated requests.
- Off-site checkout redirects are rejected.
- An invalid login to a reserved, nonexistent test address returns the expected authentication response, rather than a database/schema error. This exercises the new rate-limit table and account-column query.
- The current catalog and shipping configuration load successfully; all four policy pages return successfully.
- The browser receipt page does not claim success when opened without a valid checkout proof.
- One unpaid guest Checkout session was created successfully using live shipping quotes. Its receipt proof was returned, and checking its status correctly returned `paid: false` and `status: open`. No order was paid, subscription created, or shipping label purchased.
- HTTPS and the expected content-security, frame-protection and content-type headers are active.

## Not verified by this check

End-to-end email delivery, a completed paid checkout and its webhook, authenticated customer billing/cancellation, and authenticated label printing still need an integration check. Local tests cover those code paths with simulated providers; this deployment check did not transact against customer accounts. The locally saved admin password was not accepted, so no authenticated admin changes were made.

The Netlify dashboard's stored build settings still report `.` and no build command, while this published deployment correctly contains the `dist` output. Keep the committed `netlify.toml` in control of subsequent builds, and do not manually publish the repository root.
