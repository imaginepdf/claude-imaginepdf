---
name: design
description: Design a PDF document with ImaginePDF — invoices, receipts, certificates, reports, letters, or any custom layout. Author a design as positioned elements (text, tables, images, shapes, QR codes, barcodes), style it into something crisp and modern, bind template variables, and preview it. Use whenever the task is to create or change a document's content or layout. To produce the final PDF (single or from a dataset), hand off to `imaginepdf:generate`.
allowed-tools: Bash(node *), Read
---

# ImaginePDF — Design

Creating a design and authoring it are TWO separate steps. First `create` the
design — that only allocates it (name + optional description) and returns a
`designId`. Then build it by sending **actions** to `patch`. Each action is
`{ type, args }` and does ONE thing — add one element, update one element, bind
one variable. The server (pdftreejs — the action authority) folds your batch
over the design tree one action at a time (`tree + action → tree`) and persists
the result. You never construct raw tree JSON — you describe intent with actions.

Send MANY actions per `patch` request: it takes an ordered `actions` array,
applied sequentially and **atomically** (any failure rejects the whole batch
and the error names the failing action index). `create` does NOT take
`actions` — sending them is rejected; author through `patch`. A failed `patch`
changes nothing, so just retry it against the SAME `designId` — never re-create.

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
  `"DM Sans"`, `"Playfair Display"`) — anything else is rejected by the
  server. The pairings in `design-system.md` cover the default path; run
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" fonts` only when you want
  the full catalog (a rejection error also points you there). Weight/style are
  CSS: `fontWeight` (numeric — 400 normal, 700 bold), `fontStyle`
  (`normal`/`italic`), `textDecorationLine`
  (`none`/`underline`/`line-through`/`underline line-through`) with optional
  `textDecorationColor`/`textDecorationThickness` (pt), and `textShadows` — an
  array of glyph (text) shadow layers, each `{dx, dy, blur (pt), color (#hex),
  opacity 0..1}` (no spread; CSS text-shadow has none), e.g. `[{ "dx": 1, "dy":
  1, "blur": 2, "color": "#000000", "opacity": 0.5 }]`. Text also supports `lineHeight`
  (multiplier), `letterSpacing` (tracking in pt), `textTransform`
  (`uppercase`/`lowercase`/`capitalize` — render-time case, re-derives the box),
  `opacity` (0..1), `anchor` (`top`/`middle`/`bottom` — which edge pins when the
  derived height changes, e.g. `bottom` for a total that must end at a fixed
  baseline), and `padding` (pt — the chip inset; box grows by the insets;
  per-side `paddingTop`/`paddingRight`/`paddingBottom`/`paddingLeft`; pair with
  `backgroundColor` + `borderRadius` + `shadows` for "Paid"-style badges). Most elements
  take corner rounding — `borderRadius` (all corners) plus per-corner
  `borderTopLeftRadius`/`borderTopRightRadius`/`borderBottomRightRadius`/`borderBottomLeftRadius`
  (pt; PERCENT 0–100 on image) — a box border `borderWidth` (pt)/`borderColor`/
  `borderStyle` (`solid|dashed|dotted|double|none`) on text/image/qr/barcode,
  and a `shadows` array of `{dx,dy,blur,color,opacity}` layers (one entry = a
  tasteful lift; see reference/README.md). Shapes use SVG `stroke`/`strokeWidth` (pt)/
  `strokeStyle` + `fill` instead. Images additionally support `opacity`,
  `flipH`/`flipV`, `filters` (brightness/contrast/saturation/grayscale), and
  `data.crop` (a normalized source window — see reference/README.md).

**FILLS, DEPTH, LINKS:** any fill — text/qr/barcode/cell `backgroundColor`, shape
`fill`, the page background — accepts a **gradient** object
(`{type:'linear'|'radial', angle?, stops:[{offset,color,opacity?}]}`), not just a
hex. Drop shadows are a `shadows` array (`{dx,dy,blur,spread,color,opacity}`); one
subtle layer lifts an anchor. Any element, a whole table, and individual table
cells take an `href` (https/http/mailto/tel) for clickable links.

**PAGE / DOCUMENT BACKGROUND:** set a page's backdrop with `set_page_background`
(`{ page, backgroundColor?, backgroundImage?, backgroundSize? }`) or the document
default (cascades to pages) with `set_document_background` — flat CSS longhands,
merged per-field, a field set to `null` clears it. `backgroundColor` is a hex or a
gradient; `backgroundImage` is an image src (assets:/data:/https:) sized by
`backgroundSize` (`cover`/`contain`/`fill`). `add_page` accepts the same keys.

**PAGE SIZE / ORIENTATION:** set the paper format when you **create** the design —
`create '{"name":"…","size":"A4","orientation":"landscape"}'`. `size` is
`A4|A3|A5|Letter|Legal` (default A4); `orientation` is `portrait|landscape`
(default portrait). The first page is born at the right dimensions (e.g. A4
landscape ≈ 841.89 × 595.28 pt) — do NOT create portrait then flip. Lay out a
landscape page across the full width (content x: 50→790).
To CHANGE an existing design's format afterwards, use `update_page`
(`{ page: 0, orientation }` / `width` / `height`); `add_page` appends another
page (also accepts `orientation`) and `remove_page` deletes one (≥1 page always
kept).

## Before authoring — read these

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" actions` — the
   authoritative, live action catalog (types + args shapes).
2. `${CLAUDE_PLUGIN_ROOT}/skills/design/reference/README.md` — units, naming,
   the sizing contract, table-cell shape, and the stable conventions.
3. **`${CLAUDE_PLUGIN_ROOT}/skills/design/reference/design-system.md`** — palettes,
   type pairings, spacing, and composition patterns. Read this so the output is
   distinctive and deliberate, not the plain unstyled default.
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
| `design.cjs create '{"name":"…","description":"…"}'` | allocate an empty design, returns `designId` |
| `design.cjs patch '{"designId":"…","actions":[…]}'` | apply an action batch / rename / describe |
| `design.cjs get '{"designId":"…"}'` | full tree + bound variables |
| `design.cjs preview '{"designId":"…","page":0}'` | render a page to a PNG you can read |
| `design.cjs placeholder '{"name":"Logo","label":"LOGO"}'` | mint a replaceable placeholder image |
| `design.cjs upload '{"file":"/path.png"}'` | add an image asset (or replace one in place) |

## Workflow

0. **Style intent — settle it BEFORE authoring.**
   - The request carries style signals (a brand color, a logo, the industry,
     vibe words like "minimal"/"playful"/"formal", a reference document,
     locale)? → DERIVE the palette + type pairing from them, and say which
     vibe you chose in your summary so the user can redirect.
   - NO signals and this is a NEW design? → ask the user ONE short
     multiple-choice question before creating: 3–4 vibe options spanning
     warm / cool / minimal, plus "name a brand color" and "surprise me".
     One question only — never an interrogation.
   - SKIP asking when: the user said any form of "just make it / you choose",
     you are EDITING an existing design (keep its palette), or you cannot ask
     (non-interactive run) — then choose from context and note the choice.
   - **VARY.** The palette table is unranked; do not habitually reach for the
     same row, and the same goes for type pairings. With no contextual pull,
     pick something you haven't used recently. "Surprise me" means a
     distinctive vibe, not the safest one.

1. **Pick an exemplar; restyle it.** Read the closest file in
   `reference/gallery/` for STRUCTURE (layout, furniture, sizing recipes) and
   apply the palette/type from step 0 — do not inherit the exemplar's colors
   by default. Don't ship the plain unstyled default look; a *deliberate*
   blue palette is fine.

2. **Create the design** — allocates it (and its first page) and returns a
   `designId`. Pass `size` + `orientation` here to set the paper format up front
   (default A4 portrait); the first page is born correct. No element actions here.
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" create '{"name":"Certificate","size":"A4","orientation":"landscape"}'
   ```

3. **Build it with a first `patch`** — send your whole layout as one ordered
   `actions` array against the `designId` from step 2. Returns per-action
   `results`, each with the minted id and the **derived box**:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" patch '{"designId":"<id>","actions":[
     {"type":"add_element","args":{"type":"text","name":"title",
      "position":{"x":50,"y":50},
      "data":{"content":"Invoice #1042"},"styles":{"fontSize":24,"fontWeight":700}}},
     {"type":"add_element","args":{"type":"table","name":"items",
      "position":{"x":50,"y":120},
      "data":{"rows":4,"columns":4,"columnWidths":[235,60,100,100],
              "template":"headerRow","headerRow":true}}},
     {"type":"bind_variable","args":{"name":"title"}}
   ]}'
   ```
   Note: no `w`/`h` on the text or table — the server sizes them. A later action
   may reference an element added earlier in the same batch, by `name`. If the
   batch fails, fix it and re-run `patch` against the SAME `designId` — the
   failure persisted nothing, so don't create a new design.

4. **Refine** with further `patch` calls (e.g. `update_element` to set table
   cells, restyle, or move things). Text re-derives its box when content /
   maxWidth / metric styles change; tables re-derive on any data change.
   On `update_element`, a table's `data` accepts only `cells/columnWidths/width`
   — toggle the header via `styles.headerRow` (NOT `data.headerRow`), and remove
   header shading by clearing the header cells' `backgroundColor` in `data.cells`.

5. **Preview and revise — do this, don't skip it.** Render the page and LOOK at
   it:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" preview '{"designId":"<id>"}'
   ```
   The result has a `localPath` to a PNG — **Read that image**, then critique your
   own layout: alignment, spacing rhythm, contrast, hierarchy, overflow, balance.
   **If any image area is blank, you left it source-less or its SVG rendered
   blank — author a proper visible SVG (or a placeholder) for it before moving
   on.** `patch` to fix what's off and preview again. Iterate until it looks crisp.

6. **Verify** with `get` before handing off.

## Images and placeholders

**Every image element MUST end up with a concrete, VISIBLE source** — an authored
SVG, an uploaded asset, or a placeholder. Never leave an image blank, and never
bind an image as a substitute for giving it a real source (a bound image with no
useful design-time `data.src` renders as an empty box). The default for a logo /
brand mark / icon / illustration is: **author a real SVG and set it as a static
`data.src`** (don't bind it — see Guidance below).

You cannot see the user's local files, and the design references images by an
`assets:<id>` URN. Three paths:

- **The user gave you an image path** → `design.cjs upload '{"file":"/path/logo.png","name":"Logo"}'`.
  Use the returned `ref` (`assets:<id>`) as an image element's `data.src`.
- **Authoring artwork (logos, icons, illustrations) — write SVG.**
  NEVER compose a logo or icon out of shape elements — shapes are layout
  furniture (bands, rules, panels), not artwork; a shape collage pollutes the
  element list and can't be replaced by the real logo later. SVG is the
  native medium: crisp at any size, palette-matched, and it renders on the
  canvas, in thumbnails, AND in the PDF. Upload inline markup directly:
  ```bash
  node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" upload '{"svg":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\">…</svg>","name":"Logo"}'
  ```
  Use the returned `ref` as the image's `data.src` (the asset is replaceable
  in place later, exactly like a placeholder). A small mark may also go straight
  into `data.src` as `data:image/svg+xml;base64,…` — the server converts EVERY
  inline image payload into an asset, so the design tree and generate payloads
  only ever carry `assets:` refs, never inline bytes.

  The SVG must actually RENDER — the server rasterizes it and **rejects a blank
  result**. So: include a `viewBox` (e.g. `viewBox="0 0 64 64"`); put visible
  geometry INSIDE that box; use explicit colour values on `fill`/`stroke`
  (`#3B82F6`, not `currentColor` — there's no inherited colour context);
  self-contained markup only (no external CSS classes, no `<image href>`, no web
  fonts — convert any text to paths or use plain `<text>` with a generic family).
  If the upload is rejected as blank, fix the markup and re-upload — don't ship a
  blank box.
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

- Always `create` with a meaningful design `name` first to get a `designId`,
  then send the layout via `patch`; give every element a unique, meaningful
  element `name`.
- Lay out the whole page as ONE ordered `actions` array in your first `patch`
  when you can — paint order follows action order (later = on top; fix mistakes
  with `reorder_element`).
- Build top-to-bottom; budget vertical space as `fontSize × lineHeight` per text
  line and keep a consistent spacing rhythm (see `design-system.md`).
- Tables: one `add_element` carries the whole thing — structure
  (`rows`/`columns`/`columnWidths`/`template`) AND `cells` (`TableCell[][]`).
  Update cells later via `update_element` `data.cells`.
- Make a field fillable with `bind_variable` — the element's `name` becomes the
  variable name (the key the generation step fills), so name elements the way
  you want the dataset columns named. Bind ONLY what genuinely varies per record
  (an invoice number, a customer name, a line-items table). **Don't bind a logo /
  brand mark / decorative image** — those are constant: author them as a static
  SVG `data.src` and leave them unbound. If an image truly does vary per record,
  still give it a real design-time `data.src` (a representative SVG or a
  placeholder) so the editor, preview, and a single generate are never blank —
  binding makes the `src` fillable, it doesn't supply one.

When the design looks right, hand off to **`imaginepdf:generate`** to produce the
PDF (single, or one-per-row from a dataset).
