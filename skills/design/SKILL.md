---
name: design
description: Design a PDF document with ImaginePDF — invoices, receipts, certificates, reports, letters, or any custom layout. Author a design as positioned elements (text, tables, images, shapes, QR codes, barcodes), style it into something crisp and modern, bind template variables, and preview it. Use whenever the task is to create or change a document's content or layout. To produce the final PDF (single or from a dataset), hand off to `imaginepdf:generate`.
allowed-tools: Bash(node *), Read
---

# ImaginePDF — Design

You build a design by sending **actions** through the ImaginePDF API. Each
action is `{ type, args }` and does ONE thing — add one element, update one
element, bind one variable. The server (pdftreejs — the action authority) folds
your batch over the design tree one action at a time (`tree + action → tree`)
and persists the result. You never construct raw tree JSON — you describe
intent with actions.

Send MANY actions per request: both `create` and `patch` take an ordered
`actions` array, applied sequentially and **atomically** (any failure rejects
the whole batch and the error names the failing action index).

**SIZING IS DERIVED — the core contract:**
- **text**: `position` is `{x, y, maxWidth?}`. NEVER send `w`/`h` — the server
  derives the box from content + fontSize + lineHeight. `maxWidth` (points)
  pins the box width exactly (content wraps inside) — use it for paragraphs
  and for right/center-aligned text; omit it for single-line left-aligned
  labels.
- **table**: `position` is `{x, y}`. The box is derived from the grid — set
  `data.columnWidths` (points, one per column) or `data.width` (total, split
  equally); row heights follow cell content.
- Every action result echoes the element's `{id, name, position}` **with the
  derived box** — use it to place the next element and to check page fit.
- qr is `{x, y, size}` (square); image/barcode/shape keep `{x, y, w, h}`.

**IDS ARE SERVER-MINTED — address by name:**
- Never invent an `id`. Give each element a unique, meaningful `name`
  (`"title"`, `"items"`, `"customer_name"`) and use that name in later actions
  (`update_element`, `bind_variable`, …). The minted id comes back in results.

**CRITICAL RULES**
- Build and render PDFs ONLY through the ImaginePDF scripts. Never use Python,
  pdf-lib, LaTeX, headless browsers, or any other PDF method.
- If a script returns an error, surface it to the user. Do NOT fall back to an
  alternative approach.

**FONTS ARE A CATALOG — use proper family names:**
- `styles.fontFamily` takes a font NAME from the catalog (`"Inter"`,
  `"DM Sans"`, `"Playfair Display"`). List the live catalog with
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" fonts` — anything not in it
  is rejected by the server. Text also supports `lineHeight` (multiplier) and
  `letterSpacing` (tracking in pt).

## Before authoring — read these

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" actions` — the
   authoritative, live action catalog (types + args shapes); `… design.cjs
   fonts` — the font catalog.
2. `${CLAUDE_PLUGIN_ROOT}/skills/design/reference/README.md` — units, naming,
   the sizing contract, table-cell shape, and the stable conventions.
3. **`${CLAUDE_PLUGIN_ROOT}/skills/design/reference/design-system.md`** — palettes,
   type pairings, spacing, and composition patterns. Read this so the output is
   distinctive, not a generic blue-on-white default.
4. **`${CLAUDE_PLUGIN_ROOT}/skills/design/reference/gallery/`** — curated example
   designs (invoice, receipt, certificate, report, letter) as ready-to-send
   `actions` arrays. Start from the closest exemplar and adapt it — do not build
   from a blank page.

## Scripts

All scripts are invoked as
`node "${CLAUDE_PLUGIN_ROOT}/scripts/<script>.cjs" <subcommand> '<json>'`:

| Subcommand | What it does |
| --- | --- |
| `design.cjs actions` | live authoring action catalog |
| `design.cjs create '{"name":"…","actions":[…]}'` | create + populate in one call |
| `design.cjs patch '{"designId":"…","actions":[…]}'` | apply an action batch / rename / describe |
| `design.cjs get '{"designId":"…"}'` | full tree + bound variables |
| `design.cjs preview '{"designId":"…","page":0}'` | render a page to a PNG you can read |
| `design.cjs placeholder '{"name":"Logo","label":"LOGO"}'` | mint a replaceable placeholder image |
| `design.cjs upload '{"file":"/path.png"}'` | add an image asset (or replace one in place) |

## Workflow

1. **Pick an exemplar + a palette.** Read the closest file in `reference/gallery/`
   and choose a palette/vibe from `reference/design-system.md`. Don't default to
   blue-on-white.

2. **Create + build in one call** (a new design starts with one blank A4 page;
   pass an initial `actions` array to populate it). Returns `designId` and
   per-action `results` — each with the minted id and the **derived box**:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" create '{"name":"Invoice","actions":[
     {"type":"add_element","args":{"type":"text","name":"title",
      "position":{"x":50,"y":50},
      "data":{"content":"Invoice #1042"},"styles":{"fontSize":24,"bold":true}}},
     {"type":"add_element","args":{"type":"table","name":"items",
      "position":{"x":50,"y":120},
      "data":{"rows":4,"columns":4,"columnWidths":[235,60,100,100],
              "template":"headerRow","headerRow":true}}},
     {"type":"bind_variable","args":{"name":"title"}}
   ]}'
   ```
   Note: no `w`/`h` on the text or table — the server sizes them. A later action
   may reference an element added earlier in the same batch, by `name`.

3. **Refine** with `patch` (e.g. `update_element` to set table cells, restyle,
   or move things). Text re-derives its box when content / maxWidth / metric
   styles change; tables re-derive on any data change.

4. **Preview and revise — do this, don't skip it.** Render the page and LOOK at
   it:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" preview '{"designId":"<id>"}'
   ```
   The result has a `localPath` to a PNG — **Read that image**, then critique your
   own layout: alignment, spacing rhythm, contrast, hierarchy, overflow, balance.
   `patch` to fix what's off and preview again. Iterate until it looks crisp.

5. **Verify** with `get` before handing off.

## Images and placeholders

You cannot see the user's local files, and the design references images by an
`assets:<id>` URN. Two paths:

- **The user gave you an image path** → `design.cjs upload '{"file":"/path/logo.png","name":"Logo"}'`.
  Use the returned `ref` (`assets:<id>`) as an image element's `data.src`.
- **You need an image the user hasn't supplied yet** → mint a placeholder:
  ```bash
  node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" placeholder '{"name":"Company logo","label":"LOGO","width":200,"height":80}'
  ```
  Use the returned `ref` as the image's `data.src`. The placeholder is a real,
  rendered labeled box — a PDF generated now shows the box, never a blank gap.
  Tell the user they can drop in the real image any time with:
  `design.cjs upload '{"file":"/path/logo.png","assetId":"<the-placeholder-id>"}'`
  — this swaps the bytes **in place**, so the design needs no change.

## Guidance

- Always create with a meaningful design `name` first, and give every element a
  unique, meaningful element `name`.
- Lay out the whole page as ONE ordered `actions` array when you can — paint
  order follows action order (later = on top; fix mistakes with
  `reorder_element`).
- Build top-to-bottom; budget vertical space as `fontSize × lineHeight` per text
  line and keep a consistent spacing rhythm (see `design-system.md`).
- Tables: one `add_element` carries the whole thing — structure
  (`rows`/`columns`/`columnWidths`/`template`) AND `cells` (`TableCell[][]`).
  Update cells later via `update_element` `data.cells`.
- Make a field fillable with `bind_variable` — the element's `name` becomes the
  variable name (the key the generation step fills), so name elements the way
  you want the dataset columns named.

When the design looks right, hand off to **`imaginepdf:generate`** to produce the
PDF (single, or one-per-row from a dataset).
