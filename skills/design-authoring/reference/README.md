# Authoring reference

The **authoritative tool catalog** — every tool name, what it does, and its
input shape — is served live by the API and sourced from the design-tree
library (pdftreejs, the single source of truth). Do not rely on a hand-copied
list; fetch it:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" tools
```

This returns `{ tools: [ { name, description, input } … ] }`. Build your
`design.cjs patch` calls from that.

## Quick cheat-sheet (the stable bits)

- **Units:** points (1 inch = 72 pt). Page origin is top-left `(0,0)`.
  `position = { x, y, w, h }`, relative to the page. A4 = 595.28 × 841.89 pt.
  Use ~50 pt margins (content x: 50→545).
- **Paint order:** creation order — later elements draw on top. Add background
  shapes before the text on them.
- **List-native tools:** `add_elements` (`elements[]`), `update_elements`
  (`updates[]`), `remove_elements` (`ids[]`), `bind_variables` (`bindings[]`),
  `unbind_variables` (`targets[]`) each take an array of 1+. Page/metadata/
  background tools are singular. Prefer one bulk call over many singular ones.
- **Addressing:** give each element a stable `id` you choose; reference that id
  in later items/calls (same call or a later one).
- **Element kinds:** `text`, `image` (needs `data.src`), `qr`, `barcode`,
  `shape` (`data.shapeType`: rectangle/circle/line/arrow), `table`
  (`data.rows/columns/template/headerRow/headerColumn`).
- **Table cells (strict):** set via `data.cells` = a 2-D array. Each cell is
  EITHER a plain string (→ a text cell) OR a canonical envelope
  `{ type, data, styles? }` where `data.content` is a string for
  text/qr/barcode and `data.src` is a string for image. The table auto-resizes
  to the grid. Any other shape (e.g. `{value}`, `{url}`) is rejected with a
  precise error — fix the cell and retry; values are never silently dropped.
- **Variables:** `bind_variables { bindings:[{nodeId, field, type, name}] }` —
  `field` is `content` (text/qr/barcode), `src` (image), or `cells` (table). Each
  `name` is the key you pass at generation time.
- **Atomicity:** a `create`/`patch` call is all-or-nothing — if any tool (or any
  item within a tool) fails, the whole call is rejected and nothing is saved.
