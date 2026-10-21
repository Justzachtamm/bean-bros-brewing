# Inventory operations

## Live source

[Open the canonical inventory sheet](https://docs.google.com/spreadsheets/d/1k5aNWn0XBV7cJaqZ-U-rA0KR9cmfe2Ka6J5kxa36_Uo/edit), owned by `zach@beanbrosbrewingco.com`. The adjacent `INVENTORY-LIVE.webloc` opens the same sheet on this Mac. Maintain quantities, mappings and reconciliation records in the live sheet; do not create a local inventory copy.

## Baseline and known limits

The owner-provided baseline is **October 8, 2026, 05:11 UTC: 48 variants and 702 saleable units**, already excluding sold but unshipped stock. These figures describe the starting point, not current availability. Never deduct sales that occurred before the baseline, or deduct a sale again when it ships.

Eight exact Shopify mappings exist. Use those established mappings; do not guess a variant from an ambiguous product name, size, grind or bundle. Flag unmapped lines for review before adjusting inventory.

Existing hourly Shopify/Gmail checks are enabled and recent source-check entries are present in the live sheet. Whatnot email coverage is incomplete; direct orders and inbox access were verified in the signed-in Mac browser on October 8. This browser session is not an unattended Whatnot connector. Email silence is not evidence of zero sales or zero requests; current access does not establish complete reconciliation.

| Variant | Physical stock at handoff | Intentional website stock |
| --- | ---: | ---: |
| Hazelnut, 8 oz | 1 | 10 |
| Mexican Chiapas, 8 oz | 1 | 10 |

These two website quantities are deliberate. Use physical saleable stock when checking overselling. Do not change store counts to match this guide.

## Verified connections — October 8, 2026

| Source | Verified access | How it joins this workflow |
| --- | --- | --- |
| Google Drive / Sheets | Canonical workbook metadata and bounded tab reads succeeded. | Use the live `Inventory`, `Transactions`, `Sales history`, `Channel mapping`, `Read me` and `Customer requests` tabs. The local shortcut opens this same workbook. |
| Shopify | Bean Bros store identity and order-list read succeeded. | The existing hourly task checks orders against the eight established variant mappings. Only mapped, verified events may change the sheet ledger. |
| Gmail | `zach@beanbrosbrewingco.com` profile and a bounded Whatnot-sender search succeeded. | The hourly task uses available mail as partial sales evidence. The tested search returned no messages; it does not establish complete Whatnot coverage. |
| Whatnot | Seller Hub is signed in as `beanbros`; current order rows and inbox messages are readable through Chrome on this Mac. | Read [seller orders](https://www.whatnot.com/dashboard/orders) and [the inbox](https://www.whatnot.com/dashboard/inbox) during an attended reconciliation. Browser sign-in must remain available. No dedicated Whatnot connector or unattended order/DM polling was established. |

The enabled hosted task is **Manage Bean Bros inventory**, ID `6ac727b741cc8191ab1f5b5812b8df38`; it already targets the canonical sheet and Shopify/Gmail evidence. Its last run was recorded at 1:32 p.m. Eastern, and the sheet records source checks at 1:33 p.m. Eastern (17:33 UTC). These observations verify existing setup, not future execution or delivery. No duplicate scheduled task was created.

The sheet's early “Sales deduction status” and “Mapping” notes still describe initial setup. Consult its later source-check and coverage rows and the actual `Channel mapping` tab before posting; do not treat the old general note as permission to post an unmapped sale. Whatnot listing/SKU mappings are still blank in the inspected mapping rows. Browser access alone cannot resolve ambiguous pack sizes, bundles or giveaways.

When posting to the live ledger, append to the first blank EventID row, preserve prior rows and formulas, and verify readback before retrying an uncertain write. `Transactions` columns A:I and L are inputs; J:K are formulas. Never sort or delete ledger rows. Keep `Sales history` separate from stock movements.

## Reconciliation procedure

1. Read the live sheet and the last completed reconciliation checkpoint. Collect available Shopify orders and Gmail evidence, plus owner-supplied Whatnot orders and Whatnot-only DM requests. Record the coverage window and any missing sources.
2. Match each order line to an established variant. Deduplicate by **platform + order ID + line ID + event ID/type**. Multiple emails or checks for the same underlying event must resolve to one event; preserve source references and processing status. If identifiers or quantities are uncertain, flag the line rather than deducting it.
3. Apply only confirmed, previously unapplied sales after the baseline. Use the original sale/event time, not the time an email arrived. Deduct each confirmed sale once. Treat shipping and packing of already-sold units as fulfillment work, not additional sales deductions.
4. Review cancellations and refunds separately. A refund does not establish that goods returned to saleable stock. Add packing/restock units only when Zach reports newly prepared units with the exact variant, quantity and preparation time; record that report and deduplicate the addition. A reminder or planned packing run is not a stock addition.
5. Report confirmed sales by platform and variant, remaining saleable stock, overselling or insufficient-stock lines, and packing needs. Distinguish fulfillment of sold stock from newly prepared units needed to cover shortages. Track Whatnot-only DM requests with their order/line reference when available, the requested action and unresolved status; a DM request alone is not a sale or restock event.
6. Update the live reconciliation checkpoint and record unresolved mappings, unavailable orders/DMs and pending owner decisions. Do not claim complete Whatnot reconciliation while coverage is incomplete.

## October 8 handoff

- Whatnot show: **October 8, 2026, noon Eastern (EDT), 16:00 UTC**. Reconcile show sales, overselling, packing needs and Whatnot-only DM requests using the procedure above.
- Restock reminder: **October 8, 2026, 7:30 p.m. Eastern (EDT), 23:30 UTC**. No restock has been reported at handoff; make no addition until newly prepared units are reported.

Keep this reference local to the project. Store counts, settings, credentials, deployments, pushes, installs and customer contact are outside this documentation task.
