# Changelog

All notable changes to the ImaginePDF plugin are documented here. The plugin
follows [semantic versioning](https://semver.org); bump `version` in
`.claude-plugin/plugin.json` on every release.

## Unreleased

- **Custom page size at create.** `create` now accepts a custom first-page size
  in POINTS — `create '{"name":"Ticket","width":660,"height":360}'` — for
  non-paper formats (tickets, badges, social cards). The dims are taken
  literally; they are mutually exclusive with the named `size` (sending both is
  rejected) and `orientation` is ignored for them. The named `size`/`orientation`
  path is unchanged.
- **Inline placeholders (`{{token}}`).** A text element or table cell can now
  embed `{{token}}` placeholders to mix static and dynamic text in one element
  (e.g. `Dear {{first_name}}, your {{plan}} plan renews on {{date}}`). Bind the
  element as usual; at generation time give each token its own compound key
  `variableName::token` (`"greeting::first_name":"Jane"`, `"greeting::plan":"Pro"`)
  alongside the whole-field keys. Each token is replaced in place, surrounding
  text is kept, and unfilled tokens render empty. A variable with no `{{}}`
  tokens still takes a string (or `string[][]` for a whole table). Token names
  are letters, digits, and underscore; `page`/`pages` are reserved; a variable
  name must not contain `::`. (A legacy nested object —
  `"greeting":{"first_name":"Jane"}` — is still accepted.)
- **The API key is now set via the `IMAGINEPDF_API_KEY` environment variable
  only.** Export it before launching Claude (`export IMAGINEPDF_API_KEY=pc_live_...`
  then `claude` — a running session won't pick up a later export). The plugin's
  `userConfig` / `/plugin` keychain prompt has been removed, so installs no longer
  ask for a key up front. `IMAGINEPDF_API_URL` still overrides the base URL for
  local dev.
- **Paper size + orientation are set at design CREATE time (the canonical way to
  make a landscape / A3 / Letter document).** `create` now accepts `size`
  (`A4|A3|A5|Letter|Legal`, default A4) and `orientation` (`portrait|landscape`,
  default portrait): `create '{"name":"Cert","size":"A4","orientation":"landscape"}'`.
  The first page is **born** at the requested dimensions (the server materializes
  the initial tree at create), so a `get`/`preview` immediately shows the correct
  page — no portrait-then-flip dance. This supersedes the previous guidance to
  flip page 0 with `update_page` after create.
- `update_page` / `remove_page` remain for **editing an existing** design's page
  (resize / reorient / rename / background / multi-page management) — they are no
  longer the way to make a new landscape design.

## 0.11.0

- **Landscape (and custom-size) designs are now possible.** New `update_page`
  authoring action edits a page in place — size, orientation, name, or
  background. A design starts with one portrait A4 page (index 0); send
  `update_page { page: 0, orientation: "landscape" }` as the first action to flip
  it to landscape (dimensions swap to ≈841.89 × 595.28 pt) — no appended blank
  page to clean up. Passing `orientation` sets the dimensions to match
  (dimensions are the source of truth); `width`/`height` (points) are also
  accepted. Companion `remove_page` deletes a page (the document always keeps at
  least one). `add_page` now also folds `orientation` into the new page's
  dimensions. SKILL + reference docs document the landscape pattern.

## 0.10.0

- **Inline images always become assets — designs (and generate payloads) carry
  `assets:` refs, never inline bytes.** The server now converts EVERY inline
  `data:image/…` payload into a workspace asset (previously only SVG and rasters
  over 128 KB), so a bound image's value is a compact ref instead of the whole
  base64 blob being re-sent on every generate. SKILL doc updated to match.
- `generate`/`batch` now drop any inline `data:` image value from the supplied
  field values before sending — a generate-time image must be an `assets:<id>`
  ref (upload first), never inline bytes re-sent in the request. (The server also
  strips inline image values as a last-line guarantee.)

## 0.9.0

- **Images must always carry a real, visible source — never a blank box.** Guidance
  hardened so the agent authors a proper SVG (or a placeholder) for every image and
  sets it as a static `data.src`: an SVG needs a `viewBox`, visible geometry inside
  it, explicit `fill`/`stroke` colours (not `currentColor`), and self-contained
  markup (no external CSS/fonts). Logos/brand marks stay STATIC — don't
  `bind_variable` them; bind only images that genuinely vary per record, and even
  then keep a design-time `data.src` so the editor/preview/single-generate are
  never blank. The preview self-check now flags blank image areas. (SKILL.md,
  reference/README.md, design-system.md, BIND_VARIABLE catalog prose.)
- Server-side guard (ImaginePDF API): an uploaded SVG that rasterizes to a blank
  (fully transparent) image is now rejected with a teaching error, so a blank
  "logo" can never be stored and silently render as an empty box.

## 0.8.0

- **Docs teach the full current capability set.** The hand-written design guidance
  was out of date — it claimed "there are NO gradients, NO drop shadows" (both have
  shipped). Corrected and expanded: gradient fills (`backgroundColor`/shape `fill`/
  page background accept a `{type,angle,stops}` gradient), drop shadows (`shadows[]`),
  structured text shadows (`textShadows[]`), `href` links on any element/table/cell,
  and `set_page_background`/`set_document_background`/`add_page` flat background keys
  are now taught in SKILL.md + design-system.md + reference/README.md, with gallery
  exemplars (a soft shadow on the invoice totals box, a gradient header band in the
  report). Also fixed stale `fit`→`objectFit` and singular `shadow`→`shadows` in the
  reference. The live action catalog already served all of this; this aligns the
  taste/teaching docs so designs actually use it.

## 0.7.0

- **Flat page/document backgrounds.** Page and document backgrounds are now FLAT
  CSS longhands instead of a nested `background {color, image {src, objectFit}}`
  object: `backgroundColor` (color or gradient), `backgroundImage` (the image src),
  `backgroundSize` (cover|contain|fill — the correct CSS property; object-fit is for
  `<img>`). On `add_page` / `set_page_background` / `set_document_background`; set a
  field to `null` to clear just that longhand. The nested shape is rejected.

## 0.6.0

- **Structured text shadows.** The glyph text-shadow style key `textShadow` (a
  raw CSS string) is now `textShadows` — an array of structured layers, each
  `{dx, dy, blur (pt), color (#hex), opacity 0..1}` (no spread; CSS text-shadow
  has none), mirroring the element drop-shadow `shadows[]`. Points-only and
  scale-aware (a text shadow now scales with page-fit, like every other length).
  The live action catalog reflects this; the old CSS-string form is rejected.

## 0.5.0

- **More CSS-aligned style keys + new capabilities.** The qr/barcode/cell
  foreground color key `fgColor` is now `color` (one "foreground ink" name across
  text/icon/qr/barcode/cell). Page/document background `objectFit` drops the
  non-CSS `stretch` value for the CSS `fill`. Shapes gain a whole-element
  `opacity` (fades fill + stroke + shadow) distinct from `fillOpacity` (now the
  SVG fill paint alpha only — the stroke stays opaque). Hyperlinks (`href`) now
  apply to a whole table and to individual table cells, not just leaf elements.
  The live action catalog (`design.cjs actions`) reflects all of this; old key
  names/values are rejected.

## 0.4.0

- **More CSS-aligned style keys.** Continuing the CSS naming pass: `bgColor` →
  `backgroundColor`, the image/background `fit` → `objectFit`, `rotation` →
  `rotate`, and table `cellSpacing` → `borderSpacing`. The element drop shadow is
  now a single `shadows` array of layers (the redundant singular `shadow` is
  gone — one shadow is a one-element array). The live action catalog
  (`design.cjs actions`) reflects all of this; old key names are rejected.

## 0.3.0

- **Style keys are CSS-aligned.** The authoring style keys now match React/CSS
  names. Text weight/style use `fontWeight` (numeric — 400/700) and `fontStyle`
  (`normal`/`italic`) instead of the old `bold`/`italic` booleans; decoration is
  `textDecorationLine` (+ `textDecorationColor`/`textDecorationThickness`) instead
  of `underline`/`strikeThrough`. Element borders on text/image/qr/barcode are
  `borderWidth`/`borderColor`/`borderStyle` (shapes keep SVG `stroke`); corner
  rounding adds per-corner `borderTopLeftRadius`…`borderBottomLeftRadius`
  alongside the `borderRadius` shorthand; padding adds per-side
  `paddingTop`/`Right`/`Bottom`/`Left`; plus `textShadow`. The live action catalog
  (`design.cjs actions`) and the design gallery were updated to match — old key
  names are now rejected by the server.

## 0.2.0

- **Create and author are now separate steps.** `design.cjs create` only
  allocates a design (name + optional description) and returns a `designId`;
  it no longer accepts `actions` (the server rejects them). Send your layout
  as an ordered `actions` batch via `design.cjs patch` against that `designId`.
  This fixes a duplicate-design bug where a `create` whose initial action batch
  failed left an empty design behind, and the retry created a second, filled
  one. A failed `patch` now changes nothing — just retry it against the same
  `designId`.

## 0.1.0

- **Font catalog discovery** — new `design.cjs fonts` subcommand
  (`GET /api/v1/fonts`): the deterministic catalog of supported fonts. Font
  ids are now the PROPER FAMILY NAMES (`"Inter"`, `"DM Sans"`,
  `"Playfair Display"`) — the legacy `google:<slug>` prefix and the
  document-safe Helvetica/Times/Courier ids are gone. `styles.fontFamily` is
  validated server-side (case-insensitive, normalized to canonical casing).
- **Text spacing styles** — `letterSpacing` (tracking in pt) joins
  `lineHeight`; both re-derive the text box height server-side.
- **Exact text sizing** — the server now measures text with real per-glyph
  font metrics: derived boxes match the rendered PDF/canvas (no more
  too-tall text boxes from the old heuristic safety pad).
- Gallery exemplars + design-system guidance updated to the new font names
  (`google:source-serif-4` → `"Source Serif 4"`).
- **Style intent before authoring** — the design skill now derives the
  palette/type from the user's brand & context, asks ONE short style question
  when a new design carries no signals, and deliberately varies its choices
  (no more every-invoice-is-Emerald). Palette table doubled to 10 unranked
  vibes (warm/earthy/coastal/luxe added), custom brand-color palettes are
  first-class, and type pairings are now per-vibe. Gallery exemplar palettes
  are documented as incidental — structure to copy, colors to restyle.
- Fonts discovery is now lazy: the design-system pairings cover the default
  path; `design.cjs fonts` is for exploring the full catalog.
- **Author artwork as SVG, not shape collages** — new skill guidance + an
  `upload {"svg": "<svg…>"}` convenience that uploads inline markup as an
  `image/svg+xml` asset (no temp file). The invoice exemplar now demonstrates
  an authored SVG logo mark. File uploads also carry a proper mimetype now.
- **Image source grammar (server-enforced)** — `data.src` (and page/document
  `background.image.src`, renamed from `imageRef`) is `assets:<id>`,
  `data:image/png|jpeg|webp|svg+xml;base64` (large payloads auto-convert to
  assets), or `https://` (fetched once and frozen into an asset). Anything
  else is rejected with a teaching error.

## Unreleased

- **Corner rounding + drop shadows ("popped")** — `borderRadius` now accepts
  a number or per-corner `[tl, tr, br, bl]` (CSS order) and lands on MORE
  elements: text/table/qr/barcode/shape in POINTS (image stays PERCENT,
  tuple form added). New `shadow` bag
  `{dx, dy, blur, spread (pt), color (#hex), opacity 0..1}` on
  text/image/qr/barcode/shape(rect+circle)/table — replaced wholesale;
  defaults are a tasteful lift (dy 2, blur 6, 30% black). The PDF BAKES the
  shadow (the engine has no CSS box-shadow), pixel-matched to the canvas.
  Table radius clips fills at the box edge and rounds the outline as a ring
  for the closed-outline border modes. New TEXT `padding` (pt) — the chip
  inset: the derived box grows by 2×padding and the wrap width shrinks;
  pair with `bgColor` + `borderRadius` + `shadow` for badge looks.
- **Canva-parity table styling** — `borderMode` grows to 8 presets
  (`inner`, `inner-horizontal`, `vertical`, `inner-vertical` join
  all/none/horizontal/outer), plus `borderStyle` (solid|dashed|dotted),
  `tableSpacing` (pt outer gap — the box grows by 2×), and `opacity` (0..1)
  on the table wire. Cell styles in the `cells` grid now accept
  `textTransform` (row heights measure the transformed text — lockstep with
  the canvas), and the cell `letterSpacing` wrap math is now identical on
  both surfaces (a canvas-side drift was fixed). Merged cells spanning to a
  table edge now classify as outline edges correctly (fixes missing `outer`
  borders on merged tables).
- **QR/Barcode styling** — both gain `opacity` (0..1); rotation now has a
  canvas handle. (QR `data.margin` and barcode `textMargin` were already on
  the wire; the editor now exposes them.)
- **Canva-parity image styling** — images gain `styles.opacity` (0..1),
  `flipH`/`flipV`, a border (`stroke`/`strokeWidth` in pt/`strokeStyle`),
  and `filters` `{brightness, contrast, saturation (0..2), grayscale}` —
  filters are baked into the pixels server-side at render (the PDF engine
  has no CSS filter support) in lockstep with the canvas preview. New
  `data.crop` `{x,y,w,h}` (normalized source fractions) reframes an image
  inside its box (`fit` ignored while set; `null` clears). Image
  `borderRadius` is documented as a PERCENT (0–100) and now renders
  identically on canvas and PDF.
- **Canva-parity text styles** — three new `styles` keys for text elements:
  `textTransform` (`none`/`uppercase`/`lowercase`/`capitalize` — render-time
  case; the stored content is never mutated and the derived box accounts for
  the transformed glyph widths), `opacity` (whole-element transparency 0..1),
  and `anchor` (`top`/`middle`/`bottom` — which edge stays pinned when the
  derived text height changes, including dynamic value substitution at
  generation time). All three are validated server-side with teaching errors.
- **Actions, not tools** — the authoring surface is now an ordered batch of
  SINGULAR actions (`{type, args}`, one element per action): `add_element`,
  `update_element`, `remove_element`, `reorder_element`, `bind_variable`,
  `unbind_variable`, `add_page`, `set_page_background`,
  `set_document_background`, `set_metadata`. The catalog moved to
  `GET /api/v1/actions` (`design.cjs actions`); `create`/`patch` send
  `actions: [...]`. The old list-native `tools[]` payload and `/api/v1/tools`
  are gone (hard cutover).
- **Derived sizing** — clients no longer set text or table `w`/`h`. Text
  position is `{x, y, maxWidth?}` (the server measures content + fontSize +
  lineHeight); tables are grid-driven (`columnWidths`/`width` in points, row
  heights follow cell content). QR is `{x, y, size}`. Every action result
  echoes the derived box.
- **Server-minted ids, name addressing** — `add_element` no longer accepts an
  `id`; ids are minted server-side (`text-cfd23`). Give elements a unique
  `name` and address them by it; `bind_variable {name}` uses the element name
  as the variable name and derives the bound field from the element type.
- **Two skills only** — consolidated to `imaginepdf:design` (author/edit a
  layout) and `imaginepdf:generate` (render — single or batch). Removes the
  separate `create` / `design-authoring` / `pdf-generation` skills to cut
  permission-prompt churn.
- **Preview loop** — `design.cjs preview` renders a page to a PNG and saves it
  locally so the agent can read it and revise the layout before generating.
- **Placeholder assets** — `design.cjs placeholder` mints a labeled, renderable
  placeholder image; `design.cjs upload` adds a real image or, with `assetId`,
  swaps a placeholder's bytes **in place** (the `assets:<id>` ref is unchanged,
  no rebind). A design generated before replacement renders the placeholder, not
  a blank area.
- **Batch generation** — `generate.cjs batch` / `batch-status` / `batch-download`
  produce one PDF per dataset row (plan-gated).
- **Design taste** — bundled `skills/design/reference/design-system.md` (palettes,
  type pairings, spacing, composition patterns) and a `gallery/` of curated
  example designs to start from.
- **Config** — the API base URL is no longer a user-facing config field; only the
  API key is asked for (`IMAGINEPDF_API_URL` still works for local dev).

## 0.0.1 — Initial release

First public release of the ImaginePDF plugin for Claude Code.

- **Author designs** — build a document layout from a description (positioned
  text, tables, images, shapes, QR codes, barcodes across one or more pages) via
  the `imaginepdf:design-authoring` skill.
- **Bind template variables** — mark fields fillable so a design can be reused
  with different data.
- **Generate PDFs** — render a design to a downloadable PDF, optionally filling
  variables, via the `imaginepdf:pdf-generation` skill.
- **Entry point** — `imaginepdf:create` (or the `/imaginepdf` command)
  orchestrates authoring + generation end to end.
- **Auth** — workspace API key on `X-API-Key`, configured via `/plugin`
  (`api_key`, `api_base_url`). For local dev, `IMAGINEPDF_API_KEY` /
  `IMAGINEPDF_API_URL` are read as a fallback. Defaults to `https://api.imaginepdf.com`.
