# Changelog

All notable changes to the ImaginePDF plugin are documented here. The plugin
follows [semantic versioning](https://semver.org); bump `version` in
`.claude-plugin/plugin.json` on every release.

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

## Unreleased

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
