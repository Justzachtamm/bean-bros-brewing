# Database runtime reduction — September 19, 2026

Status: checked locally, not published. Production remains on c2ce397.

## Evidence and cause

Authenticated Netlify billing inspection on September 19 showed 2,697.5 database compute credits of 3,307 total for September 8–October 7. The database dashboard showed 15.5 GB-hours over the last 24 hours, 951.5 KB stored, and sleep after five minutes. The production branch was active; the main branch had been idle for nine days.

Both dispatchers query SQL even when their queues are empty. Their previous five-minute schedules repeatedly restart the five-minute idle window. This is a confirmed periodic source of database activity; its precise share of runtime versus visitor and other activity has not been measured. Netlify bills active database compute including idle time before suspension: https://docs.netlify.com/build/data-and-storage/netlify-database/billing-and-usage/

## Changes and functional impact

- netlify.toml: align email and measurement dispatch at minutes 0, 15, 30, and 45, reducing each from 288 to 96 runs per day. Hourly customer care and weekly backups are unchanged.
- netlify/functions/lib/customer-care.js: return before schema/database access when email delivery is not configured. Queuing remains durable, so these messages remain available after configuration.
- CUSTOMER-CARE.md: document delivery timing and capacity.
- tests/customer-care.test.cjs: verify no database access with an unconfigured sender and exactly-once delivery after configuration is restored.

Order confirmations and tracking still attempt immediate delivery. Verification/password-reset emails are unchanged. Other queued service emails and analytics events now wait up to 15 minutes without a backlog. Email fallback capacity is 12 messages/hour (previously 36); analytics capacity is 8 events/hour (previously 24). These limits retain the existing three-email/two-event batches to stay within scheduled function time limits. Backlogs can take longer to drain; higher volume should use a dedicated event-driven queue instead of increasing batch sizes without time-budget testing. Existing deduplication, uncertain-send review, analytics retries, and payload expiry remain intact.

On an otherwise idle database, aligned polling creates approximately ten minutes of sleep opportunity per quarter hour. Actual savings depend on traffic, query duration, and other database users; no live savings have been verified.

## Checks and remaining release work

npm test: 156 passed. npm run build: passed. git diff --check: passed.

Publish the completed batch once when authorized. Then verify deployed schedules and function outcomes once. Compare a subsequent 24-hour database compute window with the 15.5 GB-hour baseline and check pending queue age before claiming savings. No billing or live database settings changed.
