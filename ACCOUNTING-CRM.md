# Accounting, CRM, and sales tax

Implemented September 6, 2026.

## Admin workspace

`/admin` now includes Accounting and CRM. Existing staff authentication protects both APIs; responses are private and not cached.

Accounting stores and exports quarterly order and item tax snapshots, with state/category summaries, separate live/test filters, incomplete-record counts, an expense journal, and an append-only filing/payment log. Calendar quarters use America/New_York. Amounts in exported accounting rows are integer USD cents. Filing entries require a verified due date; recording an entry does not file a return or remit money. Monthly NJ payments may also apply.

CRM supports contacts without orders, company/phone, owner, tags, lead/customer/wholesale/inactive stages, last-contact dates, and existing order history, notes and follow-ups. No customer messages are sent.

New data lives in `business_records`; schema initialization is idempotent. The database migration is included, and backups include the new table if it exists. Expense and filing IDs are retained on retries to prevent duplicate entries. Contacts are keyed by normalized email.

## Tax collection remains pending Stripe setup

Observed in the signed-in Stripe Dashboard: the website's Stripe sandbox shows Tax “Get started.” Switching to the associated live account requires completing business verification, bank setup and account security. “Exit sandbox” explicitly says the business must be verified before live access and real payments. The user's NJ registration is confirmed by the user but is NOT yet verified as an active Stripe Tax registration. No tax registration was fabricated or submitted.

Automatic tax code is behind `STRIPE_TAX_ENABLED=true`. It remains OFF until setup is completed. Live-key checkout refuses to proceed while this flag is off; existing sandbox checkout remains usable. When enabled, checkout requires active Stripe Tax settings and an active US/NJ registration before creating a session. Stripe handles all active registered jurisdictions using the actual delivery address collected at checkout. No flat nationwide tax table is used.

Supported catalog classifications:
- Coffee beans / ground coffee: `txcd_41050006`
- Tea leaves / tea bags: `txcd_41050008`
- Physical accessories: `txcd_99999999`
- Prepared food / drinks: `txcd_40060003`
- Shipping: `txcd_92010001`

Catalog category supplies the default; Accounting can override individual products. Ambiguous herbs and unsupported categories must be classified before tax-enabled checkout. Prices and shipping use exclusive tax treatment. Existing-customer delivery/billing addresses update from Checkout. New subscriptions inherit automatic tax; changing cadence preserves price tax behavior. Existing subscriptions and existing Stripe prices are NOT bulk-migrated and require review before live activation.

## Activation checklist

1. Owner completes Stripe activation and verifies the NJ registration in the live Stripe Tax account, including actual effective date and seller origin address. Review product categories and additional registrations if any.
2. Configure the website with the correct live Stripe credentials/webhook secret and enable `STRIPE_TAX_ENABLED=true` only after readiness checks pass.
3. Ensure webhook delivery includes checkout.session.completed, checkout.session.async_payment_succeeded, invoice.paid, refund.created, refund.updated, refund.failed. Refund handling retrieves the current Stripe status and saves by refund ID.
4. Test coffee exemption, taxable accessories, mixed taxable/exempt carts, shipping, NJ and out-of-state delivery, subscriptions and renewals in configured Stripe test mode before live launch. Code tests exercise classifications and tax configuration but are not a substitute for real Stripe tax calculations.
5. Reconcile historical orders, refunds and any sales from other channels before filing.

Refunds are tracked for review; tax reductions are not invented or prorated. Stripe Tax/credit-note reports remain the source for refund tax adjustments and jurisdiction-level filing detail. Historical missing tax/mode data is flagged and excluded from complete-order totals, not treated as zero. The report shows collected tax before adjustments/payment, not a certified amount due. New webhook snapshots retain paid timestamp, currency/mode, source/payment references, item taxes, taxability reasons, totals, shipping and discounts when supplied by Stripe.

## Verification

41 automated tests pass, including real Postgres-compatible persistence, idempotent expense writes, authentication, tax configuration, unknown-category rejection, live checkout setup guard, New Jersey quarter boundaries and live/test isolation. Public build passes. Browser preview checked accounting filters, CRM editing and absence of browser errors using sample records only.

References: https://docs.stripe.com/tax/tax-codes ; https://docs.stripe.com/tax/set-up ; https://docs.stripe.com/tax/reports ; https://www.nj.gov/treasury/taxation/su_12.shtml
