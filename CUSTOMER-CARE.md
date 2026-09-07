# Customer accounts, botanicals and reviews

September 6, 2026. Customer account UI now shares the storefront typography, colors and logos. Existing session verification and account ownership are retained. New password recovery uses random one-use 30-minute tokens, hashes at rest, throttling and session revocation. Email verification remains an eight-digit, 15-minute, five-attempt challenge.

## Botanicals

The additive staff-only import uses today's Whatnot inventory snapshot and fixed numeric IDs 900001–900033. It never overwrites existing products, coffee inventory, or subsequent stock changes. Auction-only and inactive products remain unavailable. This is an initial import, not automatic inventory synchronization with Whatnot. Reconcile quantities across sales channels. Dried teas with preparation details are classified as tea; powders and ambiguous products retain an unclassified herbs category that must be reviewed before tax-enabled live checkout. Existing Stripe activation and tax readiness safeguards remain in force. Botanicals are one-time purchases and share the coffee bag and checkout.

## Service email procedures

Brevo remains the sender. Verification and reset emails are sent immediately. The hourly customer-care function queues new live order confirmations, shipment notices, delivery survey invitations, subscription acknowledgments, advance renewals (7 days for short periods, 30 days for annual periods), annual reminders, trial-ending notices and subscription change confirmations. Paid-order confirmations are also queued directly by the verified payment webhook for prompt delivery. A separate email dispatcher runs every five minutes. Login and password-change notices are queued by account events. Payment-failure and refund notices are queued from verified live Stripe webhooks. Ensure the Stripe webhook subscribes to invoice.payment_failed, refund.created and refund.updated as well as the existing order events.

A unique database message ID prevents duplicate event queueing. Sends are atomically claimed. Provider rejection is visible as failed and can be retried by staff. Timeouts/crashed sends remain under review rather than being resent with an unknown delivery outcome. Sent means provider acceptance, not confirmed inbox delivery. Three messages are sent every five minutes; increase the throughput or move to a dedicated queue as order volume grows. No historic purchase confirmations are sent on activation, and test orders do not receive service or survey campaigns.

Reviews & emails in the admin workspace contains moderation, the email log, and an advance price-notice form. Send a price notice 7–30 days before its effective date, verify acceptance in the log, then schedule the matching billing change in Stripe. The form does not change a subscription's billing price. Do not change a customer's price first and treat an after-the-fact confirmation as advance notice. Promotions must continue to use the separately opted-in marketing list.

## Delivery surveys and reviews

A verified customer can confirm receipt from their own paid live order; staff can confirm carrier/customer-verified delivery for a shipped live order. The system does not assume a printed shipping label proves delivery. Carrier tracking is linked; automatic UPS delivery-event ingestion is not implemented. Once delivery is confirmed, the hourly service queues the survey invitation. Customers select a purchased product and provide a public rating/review plus private experience and packaging feedback. One review per product per order/email is accepted. All ratings start pending. Only staff-approved reviews are returned publicly; emails, order references and survey answers stay private. Rejection requires a reason. Apply the same content policy regardless of rating; do not suppress criticism simply because it is negative.

## Legal sources and scope

New Jersey P.L.2023 c.241 requires an online way to initiate cancellation for subscriptions entered online: https://pub.njleg.state.nj.us/Bills/2022/AL23/241_.HTM
California AG's 2025 guidance describes annual reminders and 7–30-day advance fee-change notices: https://oag.ca.gov/node/608083
The FTC's March 2026 notice confirms the 2024 amended negative-option rule was vacated; it is not treated here as an operative nationwide click-to-cancel rule: https://www.ftc.gov/news-events/news/press-releases/2026/03/ftc-seeks-public-comment-response-advance-notice-proposed-rulemaking-regarding-negative-option
These are operational safeguards for the current US store, not a certification covering every state, future plan length, promotion or trial. Review notice timing before introducing new long-term commitments or trials. Existing online cancellation remains available without contacting staff.

## Email authentication repair

September 6, 2026: Brevo API IP blocking was active with an empty allowlist. Netlify used different outbound IPs across functions. With the owner’s explicit approval, API IP blocking was disabled while secret-key authentication remains required. The sender and reply-to now use the existing verified zach@beanbrosbrewingco.com address; its domain has DKIM and DMARC configured in Brevo. After propagation, the live account verification endpoint successfully submitted an email to the owner’s signed-in account. Provider acceptance was verified; inbox receipt remains user-confirmed.
