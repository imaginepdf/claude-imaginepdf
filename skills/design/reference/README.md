# Authoring reference

The **authoritative action catalog** — every action type, what it does, and its
args shape — is served live by the API and sourced from the design-tree
library (pdftreejs, the single source of truth). Do not rely on a hand-copied
list; fetch it:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" actions
```

This returns `{ actions: [ { name, description, args } … ] }`. Build your
`design.cjs patch` calls from that (`create` only allocates the design — it
takes no actions).

## Quick cheat-sheet (the stable bits)

- **The model:** `tree + action → tree`. Each action is `{ type, args }` and
  does ONE thing (one element / one binding / one page op). Send an ordered
  `actions` array; it applies sequentially and atomically.
- **Units:** points (1 inch = 72 pt). Page origin is top-left `(0,0)`.
  A4 portrait = 595.28 × 841.89 pt (landscape swaps to 841.89 × 595.28). Use
  ~50 pt margins (portrait content x: 50→545; landscape x: 50→790).
- **Page size / orientation:** set it at **create** —
  `create '{"name":"…","size":"A4","orientation":"landscape"}'`. `size` is
  `A4|A3|A5|Letter|Legal` (default A4); `orientation` is `portrait|landscape`
  (default portrait). The first page is born at the right dimensions — don't
  create portrait then flip. To CHANGE an existing design's format, use
  `update_page` (`{ page: 0, orientation }` / `width` / `height`); `add_page`
  appends a page, `remove_page` deletes one (≥1 page always kept).
- **Sizing is derived (never send what the server computes):**
  - text → `position: {x, y, maxWidth?}`. Width/height come from content +
    fontSize + lineHeight. `maxWidth` (pt) pins the box width EXACTLY —
    content wraps inside it, shorter content leaves slack. Set it for
    paragraphs and for right/center-aligned blocks (it's what keeps the
    aligned edge stable); omit it for one-line left-aligned labels (the box
    hugs the content).
  - table → `position: {x, y}` + `data.columnWidths` (pt, one per column) or
    `data.width` (pt total, split equally). Row heights follow cell content;
    the box is the grid sum.
  - qr → `position: {x, y, size}` (square). image/barcode/shape →
    `position: {x, y, w, h}`.
  - Every result echoes the **derived** `{id, name, position}` — use it to
    place the next element (`next y = y + h + gap`) and to check page fit.
- **Right-aligned text recipe:** give it `maxWidth` and `textAlign:'right'`,
  with `x = rightRail − maxWidth` (e.g. `x = 545 − 200`, `maxWidth: 200`) so
  the right edge is pinned regardless of content length.
- **Fonts are a catalog:** `styles.fontFamily` is a font NAME from
  `design.cjs fonts` (`"Inter"`, `"DM Sans"`, `"Source Serif 4"`, …) —
  case-insensitive, normalized server-side; unknown names are rejected with a
  teaching error. Text spacing: `lineHeight` (multiplier, default 1.5) and
  `letterSpacing` (tracking in POINTS, e.g. `1` for spaced-out uppercase
  eyebrows) — both re-derive the text box height.
- **More text styles:** `textTransform` (`none`/`uppercase`/`lowercase`/
  `capitalize`) is a render-time case transform — the stored content is never
  mutated, and the box height re-derives for the transformed glyphs (note:
  `capitalize` follows the PDF renderer's rule — punctuation is not a word
  boundary, so `foo-bar` prints `Foo-bar`). `opacity` is whole-element
  transparency 0..1 (1 = opaque). `anchor` (`top` default/`middle`/`bottom`)
  picks which edge stays pinned when the derived height changes — including
  when a bound variable's substituted value is taller/shorter at generation
  time (`bottom` grows upward; upward growth is not collision-checked against
  content above).
- **Text chips (badge look):** `padding` (pt, uniform) insets the glyphs and
  GROWS the derived box by 2×padding on both axes (wrap width shrinks
  accordingly); pair it with `backgroundColor` + `borderRadius` + `shadows` for a
  "Paid"-style badge.
- **Corner rounding, border & shadows (most elements):** `borderRadius` rounds
  all corners; per-corner `borderTopLeftRadius`/`borderTopRightRadius`/`borderBottomRightRadius`/`borderBottomLeftRadius`
  override individually — POINTS on text/table/qr/barcode/shape, PERCENT (0–100)
  on image. A box border on text/image/qr/barcode is `borderWidth` (pt)/`borderColor`/`borderStyle`
  (`solid|dashed|dotted|double|none`); shapes use SVG `stroke`/`strokeWidth`/`strokeStyle`
  plus `fill`/`fillOpacity` (the fill-paint alpha, distinct from whole-element `opacity`
  which fades fill + stroke + shadow). `shadows`
  is an array of drop-shadow layers, each `{dx, dy, blur, spread (pt), color (#hex, NO alpha), opacity 0..1}`,
  on text/image/qr/barcode/shape(rect+circle)/table —
  replaced WHOLESALE on update; layer defaults dx 0, dy 2, blur 6, opacity 0.3 (a
  tasteful "lift"); rendered identically on canvas and PDF (the PDF bakes it
  — the engine has no CSS box-shadow).
- **Gradients & links:** any fill — text/qr/barcode/cell `backgroundColor`, shape
  `fill`, the page background — accepts a gradient object
  `{type:'linear'|'radial', angle?, stops:[{offset (0..1), color, opacity?}]}` as
  well as a hex. An `href` (https/http/mailto/tel) makes any element, the whole
  table, or an individual table cell a clickable link.
- **Ids are server-minted; address by `name`:** never send an `id` on
  `add_element`. Give each element a unique, meaningful `name` and use
  `{name: "..."}` (or the echoed id) in `update_element` / `remove_element` /
  `reorder_element` / `bind_variable` / `unbind_variable`. A later action may
  reference a name created earlier in the SAME batch.
- **Paint order:** action order — later elements draw on top. Add background
  shapes before the text on them; fix mistakes with
  `reorder_element {name, to: front|back|forward|backward|index}`.
- **Image sources (strict grammar):** `data.src` is `uploads:<id>` (from
  `upload` — agent images, kept out of the user's asset library),
  `assets:<id>` (a user-library asset),
  `data:image/png|jpeg|webp|svg+xml;base64,…` (inline; auto-uploaded to
  `uploads`), or `https://…` (fetched ONCE server-side and frozen — the PDF can
  never change because a remote image did). Anything else is rejected. Page/document
  backgrounds use FLAT CSS longhands (no nested object) — `backgroundColor`
  (color or gradient), `backgroundImage` (the src, same grammar), `backgroundSize`
  (cover|contain|fill) — on `add_page` / `update_page` / `set_page_background` /
  `set_document_background`.
- **Element kinds:** `text`, `image` (needs `data.src`), `qr`, `barcode`,
  `shape` (`data.shapeType`: rectangle/circle/line/arrow), `table`
  (`data.rows/columns/columnWidths/width/template/headerRow/headerColumn/cells`).
- **Table `data` is add-vs-update asymmetric:** `add_element` accepts all of
  those `data` keys, but `update_element` accepts only `data.cells / columnWidths
  / width` (the grid). The header flags are STYLES — toggle them after creation
  via `styles.headerRow` / `styles.headerColumn` (NOT `data.headerRow`).
  `rows`/`columns`/`template` are add-only; reshape an existing table by
  resending `data.cells`.
- **Table styling:** `borderMode` picks which lines draw —
  `all|none|horizontal|outer|inner|inner-horizontal|vertical|inner-vertical`
  — composed with `borderColor`/`borderWidth` (pt)/`borderStyle`
  (solid|dashed|dotted). `borderSpacing` (pt) gaps the cells; `tableSpacing`
  (pt) is the OUTER gap between the table box edge and the grid (the box
  grows by 2×tableSpacing). `banding` `{evenColor, oddColor}` zebra-fills
  body rows below explicit fills; `opacity` (0..1) fades the whole table.
  `borderRadius` (pt; all corners, or per-corner `borderTopLeftRadius` …) rounds the table CARD — it
  clips fills at the box edge (visible grid rounding needs
  radius > tableSpacing) and, for the closed-outline modes (`all` without
  borderSpacing, `outer`), the outline draws as a rounded ring; `shadows` lift
  the whole table. A table and individual cells can carry an `href` link.
  Cell styles in the `cells` grid also accept `textTransform`
  (none|uppercase|lowercase|capitalize — row heights account for the
  transformed text), `letterSpacing` (pt) and `lineHeight`.
- **Header shading:** `styles.headerRow` only marks the first row as a header
  (it adds NO fill by itself). A faint header shade comes from the `headerRow`
  table **template's** header-cell fills (applied at create). To remove it, set
  those header cells' `backgroundColor` to your page color (or unset it) via
  `data.cells`, or don't apply the `headerRow` template.
- **QR/Barcode extras:** both accept `opacity` (0..1), `rotate`,
  `borderRadius` (pt — rounds the code card; modest radii only eat the baked
  quiet zone, oversized ones clip the symbol) and `shadows`. QR
  `data.margin` is the quiet zone in MODULES (default 4); barcode
  `textMargin` (pt) is the gap between bars and caption.
- **Image styling:** `styles` supports `objectFit`, `borderRadius` (PERCENT 0–100;
  50 on a square = circle; all corners, or per-corner
  `borderTopLeftRadius` … `borderBottomLeftRadius`), `shadows` (see the
  corner/border/shadow bullet), `opacity` (0..1), `flipH`/`flipV` (booleans),
  `borderWidth` (POINTS, drawn inside the box)/`borderColor`/`borderStyle`
  (solid|dashed|dotted|double|none), and `filters` `{brightness, contrast, saturation
  (0..2, 1 = neutral), grayscale (boolean)}` — the filters object is replaced
  wholesale on update. `data.crop` `{x,y,w,h}` is a NORMALIZED source window
  (fractions 0..1, `x+w ≤ 1`, `y+h ≤ 1`): the window fills the box exactly
  and `objectFit` is ignored while set; `crop: null` clears it on update.
- **Barcode formats (strict):** `CODE128` (default, any ASCII), `CODE39`
  (digits/letters/space/`- . $ / + %`), `EAN13` (12–13 digits), `EAN8` (7–8),
  `UPC` (11–12), `ITF14` (13–14 digits) — GTIN check digits are computed when
  omitted and VERIFIED when supplied; invalid content is rejected with the
  rule in the error (see the live catalog for the full rules). The
  human-readable caption is always centered; size it with `styles.fontSize`
  (pt, default 12) and gap `styles.textMargin` (pt, optional) — an oversized
  caption is clamped at render to fit the element width. Barcode `w`/`h` are
  free and parametric: bars + quiet zones fill the width (more characters =
  denser bars; keep the element wide enough to scan), and bars fill the
  height above the caption. QR `data` also
  takes `errorCorrectionLevel` (L/M/Q/H) and `margin` (quiet-zone modules).
- **Table cells (strict):** `data.cells` = a 2-D array. Each cell is EITHER a
  plain string (→ a text cell) OR a canonical envelope `{ type, data, styles? }`
  where `data.content` is a string for text/qr/barcode and `data.src` is a
  string for image — e.g. a barcode cell:
  `{ "type": "barcode", "data": { "content": "4006381333931", "format": "EAN13" } }`.
  The grid resizes to fit `cells` (max **500 rows × 50 columns**). Any other
  shape (e.g. `{value}`, `{url}`) is rejected with a precise error — fix the
  cell and retry; values are never silently dropped. qr/barcode CELLS follow
  the SAME format/content rules as standalone elements (non-empty content is
  validated up front; empty = placeholder). `columnWidths` entries must be
  positive points (floored at 15pt per column).
- **Variables:** `bind_variable {name}` — that's the whole args. The element's
  `name` becomes the variable name (the key you pass at generation time); the
  bound field is derived from the element type (text→content, image→src,
  qr/barcode→content, table→cells). So name elements the way you want the
  dataset columns named, BEFORE binding. Bind only what genuinely varies per
  record. An IMAGE binds its `src`, so don't bind a logo/brand mark (constant —
  author it as a static SVG); bind an image only if it really differs per row,
  and keep a real design-time `data.src` (a representative SVG) so
  it never renders blank when no value is supplied.
- **Inline placeholders:** to mix static and dynamic text in ONE element, type
  `{{token}}` placeholders right in a text element's `content` (or a table
  cell), then `bind_variable` the element as usual. At generation time that
  variable takes an OBJECT of token values (e.g.
  `"greeting":{"first_name":"Jane"}`) instead of a single string — each
  `{{token}}` is replaced in place. Token names are letters, digits, and
  underscore (no spaces, periods, or hyphens); `page`/`pages` are reserved.
  You cannot style individual tokens (style runs
  don't cross the API). Prefer this over splitting a sentence into several
  positioned text boxes.
- **Atomicity:** a `patch` call is all-or-nothing — if any action fails, the
  whole call is rejected, nothing is saved, and the error names the failing
  action index (`actions[3] (add_element) failed: …`). A failed `patch` leaves
  the design untouched, so retry against the same `designId` (`create` takes no
  actions, so there's nothing to be atomic about there).
- **Sample content matters:** the derived text box is measured from the
  design-time content. For bound fields, author representative sample values
  (e.g. `"$1,234.50"`, a realistic name) so generated values fit the box.
