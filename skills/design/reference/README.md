# Authoring reference

The **authoritative action catalog** — every action type, what it does, and its
args shape — is served live by the API and sourced from the design-tree
library (pdftreejs, the single source of truth). Do not rely on a hand-copied
list; fetch it:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" actions
```

This returns `{ actions: [ { name, description, args } … ] }`. Build your
`design.cjs create` / `patch` calls from that.

## Quick cheat-sheet (the stable bits)

- **The model:** `tree + action → tree`. Each action is `{ type, args }` and
  does ONE thing (one element / one binding / one page op). Send an ordered
  `actions` array; it applies sequentially and atomically.
- **Units:** points (1 inch = 72 pt). Page origin is top-left `(0,0)`.
  A4 = 595.28 × 841.89 pt. Use ~50 pt margins (content x: 50→545).
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
- **Ids are server-minted; address by `name`:** never send an `id` on
  `add_element`. Give each element a unique, meaningful `name` and use
  `{name: "..."}` (or the echoed id) in `update_element` / `remove_element` /
  `reorder_element` / `bind_variable` / `unbind_variable`. A later action may
  reference a name created earlier in the SAME batch.
- **Paint order:** action order — later elements draw on top. Add background
  shapes before the text on them; fix mistakes with
  `reorder_element {name, to: front|back|forward|backward|index}`.
- **Element kinds:** `text`, `image` (needs `data.src`), `qr`, `barcode`,
  `shape` (`data.shapeType`: rectangle/circle/line/arrow), `table`
  (`data.rows/columns/columnWidths/width/template/headerRow/headerColumn/cells`).
- **Barcode formats (strict):** `CODE128` (default, any ASCII), `CODE39`
  (digits/letters/space/`- . $ / + %`), `EAN13` (12–13 digits), `EAN8` (7–8),
  `UPC` (11–12), `ITF14` (13–14 digits) — GTIN check digits are computed when
  omitted and VERIFIED when supplied; invalid content is rejected with the
  rule in the error (see the live catalog for the full rules). The
  human-readable caption is always centered; size it with `styles.fontSize`
  (pt, default 12) and gap `styles.textMargin` (pt, optional). QR `data` also
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
  dataset columns named, BEFORE binding.
- **Atomicity:** a `create`/`patch` call is all-or-nothing — if any action
  fails, the whole call is rejected, nothing is saved, and the error names the
  failing action index (`actions[3] (add_element) failed: …`).
- **Sample content matters:** the derived text box is measured from the
  design-time content. For bound fields, author representative sample values
  (e.g. `"$1,234.50"`, a realistic name) so generated values fit the box.
