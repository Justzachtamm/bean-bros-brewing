# Customer website accessibility review

Reviewed September 16, 2026. Target: WCAG 2.2 Level AA. Changes are local and ready for release; this review is not a declaration of full conformance or legal ADA certification.

## Changes

| Issue | Fix | Relevant criteria |
| --- | --- | --- |
| Homepage captions had 1.25:1 contrast; collection secondary text also failed | Readable text/background combinations for captions and secondary text | 1.4.3 |
| Weak form boundaries and incomplete focus styling | Darker input borders; visible focus for textarea, summary and programmatic focus; contrasting outer ring | 1.4.11, 2.4.7 |
| Account links were below the 24px target minimum | Larger account action buttons and policy navigation targets | 2.5.8 |
| Cart redraw and account transitions could lose keyboard focus | Restore focus after quantity/removal changes, authentication screens and account navigation; focus subscription step headings | 2.4.3 |
| Ambiguous product actions and unnamed shipping progress | Product-specific accessible names; progress linked to its descriptive text | 2.4.6, 4.1.2 |
| Cookie banner could cover controls | Place consent in normal document flow; focus its heading when opened and return focus after saving | 2.4.11 |
| Narrow policy pages overflowed and navigation links crowded together | Wrapping navigation, long-text wrapping and narrower table spacing | 1.4.10, 2.5.8 |
| Outdated accessibility statement | WCAG 2.2 target, current embedded checkout description and honest testing limitations | Documentation |

## Verification

- axe-core scans using WCAG 2 A/AA, 2.1 AA and 2.2 AA rules found no violations in tested final desktop states: homepage, coffee product options, populated bag, first checkout screen, subscription builder, account sign-in/sign-up, collection accessories and merch, generated shop/product page, and privacy/terms/shipping/accessibility pages.
- At 320 CSS pixels, checked homepage, mobile navigation, product dialog, account sign-in, accessories, generated product page, privacy/accessibility and 404. No document horizontal overflow remained in these checked states. This covers narrow-layout reflow, not a complete browser-zoom certification.
- Keyboard checks: Enter operates mobile navigation/account controls; checkout Escape closes and returns focus to the bag button; cart quantity change continues to the Remove button; subscription Next moves focus to the new step heading; account sign-up moves focus to its heading; cookie choices return focus to Cookie settings.
- Existing reduced-motion support retained. Browser semantic trees reviewed for labels, headings and named dialogs. No accessibility overlay installed.
- `npm test`: 151 passed. `npm run build`: passed. `git diff --check`: passed.
- Scans used a temporary local QA server with axe injected only into local responses. Audit scripts and dependencies are not included in the production bundle.

## Remaining verification

A full VoiceOver/NVDA review, zoom/text-spacing testing across supported browsers, authenticated account flows, all product/image content, and end-to-end Stripe wallet/card/address components remain to be tested. No real order or payment was submitted during this review. Third-party iframe contents are not fully covered by parent-page scans. Changes have not been deployed; live verification follows release.

References: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [DOJ web accessibility guidance](https://www.ada.gov/resources/web-guidance/).
