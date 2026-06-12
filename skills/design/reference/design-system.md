# Design system — make it crisp, modern, and distinctive

The renderer is competent but plain by default. The difference between a generic
document and one a user would actually use is **deliberate choices**: one palette,
a clear type hierarchy, a consistent spacing rhythm, and one strong visual anchor.
Pick a vibe per document. Do not default to blue-on-white.

## What the renderer can and can't do

Use these to build depth (there are NO gradients, NO drop shadows, NO blur):

- A **dark header band** (a filled `shape` rectangle spanning the page width) with
  light text on top — the single biggest "designed" signal.
- A **thin accent rule** (a 2–4 pt tall filled rectangle, or a `line` shape) under
  the header or between sections.
- **Generous whitespace** and tight alignment to an invisible grid.
- **One** bold accent color, used sparingly (section labels, totals, a rule).
- Rounded corners on shapes/images (`borderRadius`) and `fillOpacity` for soft
  tint panels.

Available fonts: the catalog font NAMES served by
`node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" fonts` (GET /api/v1/fonts) —
e.g. `"Inter"`, `"Poppins"`, `"DM Sans"`, `"Playfair Display"`,
`"Source Serif 4"`. The server validates `styles.fontFamily` against the
catalog (case-insensitive, normalized to the canonical name); anything else is
rejected. Text also supports `lineHeight` (multiplier, default 1.5) and
`letterSpacing` (tracking in pt — great for spaced-out uppercase eyebrows).

## Palettes (pick ONE)

Each: `ink` (primary text), `muted` (secondary text), `band` (dark header fill),
`accent` (one highlight), `panel` (soft section fill), `hairline` (rules).

| Name | ink | muted | band | accent | panel | hairline |
| --- | --- | --- | --- | --- | --- | --- |
| Midnight | `#0F172A` | `#64748B` | `#0B1220` | `#3B82F6` | `#F1F5F9` | `#E2E8F0` |
| Emerald | `#0B1B14` | `#5B6B63` | `#0E3B2E` | `#10B981` | `#ECFDF5` | `#D1FAE5` |
| Amber/Charcoal | `#1C1917` | `#78716C` | `#1C1917` | `#F59E0B` | `#FAF7F2` | `#E7E2DA` |
| Plum/Rose | `#1A0B1E` | `#7A6B80` | `#3B0764` | `#EC4899` | `#FCF2F8` | `#F3E0EC` |
| Mono/Slate | `#111827` | `#6B7280` | `#111827` | `#111827` | `#F3F4F6` | `#E5E7EB` |

White page background (`#FFFFFF`) is the default canvas; `panel` is for section
cards; `band` text should be `#FFFFFF` or a near-white.

## Type scale (points)

| Role | Size | Weight | Notes |
| --- | --- | --- | --- |
| Display / doc title | 28–34 | bold | the one big thing |
| Section header (H2) | 16–18 | bold | |
| Eyebrow / label (H3) | 9–11 | bold | UPPERCASE; use accent or muted color |
| Body | 10–11 | regular | `ink`; lineHeight 1.4–1.5 |
| Caption / fine print | 8–9 | regular | `muted` |

Pair at most two families: a strong display/sans for headings + a readable body
(e.g. `"Poppins"` headings + `"Inter"` body; or all-`"DM Sans"`;
or a serif `"Source Serif 4"`/`"Playfair Display"` title + `"Inter"` body).

## Spacing & grid

- Page A4 = 595.28 × 841.89 pt. Margins ~50 pt → content x: 50 → 545 (width 495).
- Spacing scale: **8 / 12 / 16 / 24 / 32 / 48**. Pick from it; don't freehand gaps.
- Section-to-section gap: 24–32 pt. Inside a card: 12–16 pt padding.
- Align everything to a small set of x-positions (e.g. left rail 50, right rail
  545, a mid column). Ragged left edges read as amateur.
- **Vertical rhythm with derived sizing:** text height is computed by the server
  as `lines × fontSize × lineHeight` — budget space the same way. One body line
  at 11/1.5 ≈ 17 pt; a 24 pt bold title ≈ 36 pt. Every action result echoes the
  derived box, so place the next element at `y + h + gap` (gap from the spacing
  scale) instead of guessing heights.
- **Pinned-edge recipes:** right-aligned text → `maxWidth` + `textAlign:'right'`
  with `x = rightRail − maxWidth`; centered text → `maxWidth` +
  `textAlign:'center'` with `x = (595.28 − maxWidth) / 2`. Without `maxWidth`
  the box hugs the content and the aligned edge moves with it.

## Composition patterns (reusable furniture)

- **Header band:** full-width `shape` rectangle (x 0, w = page width) filled with
  `band`, ~110–150 pt tall, bleeding to the page edges; company name + doc type in
  light text on top; an accent rule rectangle at its bottom edge.
- **Eyebrow + value meta block:** small UPPERCASE `muted` label above a bold `ink`
  value; stack several right-aligned for dates/totals (see the invoice exemplar).
- **Section card:** a `panel`-filled rounded rectangle behind grouped content;
  add the background shape FIRST (paint order = creation order).
- **Totals box:** a `band`- or `accent`-filled rectangle with the final amount in
  large light text — the second visual anchor after the header.
- **Footer:** a `hairline` rule, then centered `muted` caption fine print.
- **Signature block:** a thin `line` shape with a small `muted` caption under it.

## Do / Don't

- DO choose one palette and one accent; repeat them.
- DO give the page one clear focal point (header band or title), then calm detail.
- DO leave whitespace — cramped is the #1 "templatey" tell.
- DON'T center everything; mix left-aligned content with a few right-aligned anchors.
- DON'T use more than two font families or more than one accent color.
- DON'T rely on effects the renderer ignores (gradients/shadows) — fake depth with
  bands, rules, tint panels, and whitespace.

**Always `preview` and Read the PNG, then revise.** Judge it as a designer would.
