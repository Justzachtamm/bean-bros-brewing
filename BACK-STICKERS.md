# Back sticker update

Source: Bean_Bros_ALL_30_Herbs_4x6_MATCHED.pdf (provided September 11, 2026).

28 stickers rendered directly from the supplied PDF and matched by visible product and ingredient names. Page 25 has misleading hidden Neuro Shroom text; the visible label is Spirulina Surge. Pages 28 and 30 are image-only.

| PDF page | Catalog product | Product ID |
| --- | --- | --- |
| 1 | Neuroshroom | herb-09 |
| 2 | Elder Elixer | herb-07 |
| 3 | Root Awakening | herb-13 |
| 4 | Tree of Life | herb-08 |
| 5 | African Emerald | herb-31 |
| 6 | Citrus Gold | herb-12 |
| 7 | Ashwa Zen | herb-17 |
| 8 | Lemon Chill | herb-14 |
| 9 | Lavender Bloom | herb-18 |
| 10 | Yerba Mate | herb-19 |
| 11 | Ruby Rose | herb-11 |
| 12 | Pharaoh’s Rest | herb-15 |
| 13 | Cinnamon Fire Bark | herb-16 |
| 14 | Hibiscus Glow | herb-10 |
| 15 | Peppermint Power | herb-22 |
| 16 | Chlorella Boost | herb-23 |
| 17 | Spearmint Zen | herb-24 |
| 18 | Nile Mint | herb-21 |
| 19 | Blue Magic | herb-28 |
| 20 | Alfalfa Fuel | herb-27 |
| 21 | Devil’s Claw | herb-25 |
| 22 | Mullein Magic | herb-20 |
| 23 | Echinacea Armor | herb-26 |
| 24 | Heart Beet | herb-29 |
| 26 | Marshmallow Root | herb-04 |
| 27 | Sage Leaf | herb-00 |
| 28 | Reishi Mushroom | herb-06 |
| 29 | Thrive Mode | herb-05 |

Alias matches: Sage Wisdom = Sage Leaf; Root Relief = Marshmallow Root; Reishi Restore = Reishi Mushroom; Elder Elixir = Elder Elixer; Neuro Shroom = Neuroshroom.

Unassigned: page 25 Spirulina Surge and page 30 Atlantic Rise have no matching catalog entries. Existing backs retained for the three bundles, Saffron, and Ceremonial Matcha because the PDF supplies no matching stickers. Echinacea Armor is matched by name; the new label specifies root while the existing catalog subtitle says herb.

Changed: assets/herb-details.js, collections/catalog.js, assets/storefront.js, collections/app.js, and 28 collections/assets/herbs/*-back.png files. Existing unrelated workspace edits preserved.

Checked: 119 tests passed; production build passed; both product views checked for all 28 mappings; built sticker files match their assigned rendered PDF pages.

Status: ready locally, not published. No deployment performed.

## October 7, 2026 — new herb and tea stickers

Created ten matching front stickers (3.5 × 1.5 inches) and ten separate back stickers (4 × 6 inches) for Chaga, Turkey Tail, Kava Kava, Japanese Culinary Matcha, five 10-bag teas, and the 10-bag sampler containing two of each tea.

The master is now `/Users/zachtammous/Downloads/Bean_Bros_ALL_41_Herbs_4x6_MATCHED.pdf`. It appends these ten backs to the existing 31-page master; all original pages were verified unchanged. The original master is preserved.

| New master page | Product |
| --- | --- |
| 32 | Chaga Mushroom Powder |
| 33 | Turkey Tail Mushroom Powder |
| 34 | Kava Kava Root Powder |
| 35 | Japanese Culinary Matcha |
| 36 | Hibiscus Glow Tea Bags |
| 37 | Peppermint Power Tea Bags |
| 38 | Raspberry Leaf Tea Bags |
| 39 | Pharaoh's Rest Chamomile Tea Bags |
| 40 | Root Awakening Ginger Tea Bags |
| 41 | Herbal Tea Sampler — 2 of Each |

Individual PDFs are in `/Users/zachtammous/Downloads/Bean Bros - New Herb Sticker PDFs`, organized into Front and Back folders. The PDF-only archive is `/Users/zachtammous/Downloads/Bean-Bros-20-Separate-Sticker-PDFs.zip`.

Source, product data, printable files, images, and verification renders are in `output/herb-launch-2026-10-07/`. Shopify is the requested website destination; no Netlify release was made. All ten Shopify and Whatnot listings are active with 20 available each and matching bag renders as primary images, followed by front/back sticker images. The Shopify homepage addition is saved and previewed in the draft theme `Bean Bros - new herbs Oct 7`; manual theme publication remains because the connector blocks publishing. See the launch handoff in that output folder for details.
