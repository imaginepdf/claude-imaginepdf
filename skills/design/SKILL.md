---
name: design
description: Design a PDF document with ImaginePDF — invoices, receipts, certificates, reports, letters, or any custom layout. Author a design as positioned elements (text, tables, images, shapes, QR codes, barcodes), style it into something crisp and modern, bind template variables, and preview it. Use whenever the task is to create or change a document's content or layout. To produce the final PDF (single or from a dataset), hand off to `imaginepdf:generate`.
allowed-tools: Bash(node *), Read
---

# ImaginePDF — Design

You build a design by calling **authoring tools** through the ImaginePDF API.
Each tool call is `{ tool, input }`; the server (pdftreejs — the tool authority)
applies the batch to the design's node tree and persists it. You never construct
raw tree JSON — you describe intent with tools.

The element + variable tools are **list-native**: one `add_elements` call lays
down MANY elements at once (and `update_elements` / `remove_elements` /
`bind_variables` likewise take arrays). Prefer one bulk call over many singular
ones. You can pass tools to `create` (build in one request) or `patch` (edit an
existing design) — both take a `tools` array.

**CRITICAL RULES**
- Build and render PDFs ONLY through the ImaginePDF scripts. Never use Python,
  pdf-lib, LaTeX, headless browsers, or any other PDF method.
- If a script returns an error, surface it to the user. Do NOT fall back to an
  alternative approach.

## Before authoring — read these

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" tools` — the authoritative,
   live tool catalog (names + input shapes).
2. `${CLAUDE_PLUGIN_ROOT}/skills/design/reference/README.md` — units, addressing,
   table-cell shape, and the stable conventions.
3. **`${CLAUDE_PLUGIN_ROOT}/skills/design/reference/design-system.md`** — palettes,
   type pairings, spacing, and composition patterns. Read this so the output is
   distinctive, not a generic blue-on-white default.
4. **`${CLAUDE_PLUGIN_ROOT}/skills/design/reference/gallery/`** — curated example
   designs (invoice, receipt, certificate, report, letter) as ready-to-send
   `tools` arrays. Start from the closest exemplar and adapt it — do not build
   from a blank page.

## Scripts

All scripts are invoked as
`node "${CLAUDE_PLUGIN_ROOT}/scripts/<script>.cjs" <subcommand> '<json>'`:

| Subcommand | What it does |
| --- | --- |
| `design.cjs tools` | live authoring tool catalog |
| `design.cjs create '{"name":"…","tools":[…]}'` | create + populate in one call |
| `design.cjs patch '{"designId":"…","tools":[…]}'` | apply a tool batch / rename / describe |
| `design.cjs get '{"designId":"…"}'` | full tree + bound variables |
| `design.cjs preview '{"designId":"…","page":0}'` | render a page to a PNG you can read |
| `design.cjs placeholder '{"name":"Logo","label":"LOGO"}'` | mint a replaceable placeholder image |
| `design.cjs upload '{"file":"/path.png"}'` | add an image asset (or replace one in place) |

## Workflow

1. **Pick an exemplar + a palette.** Read the closest file in `reference/gallery/`
   and choose a palette/vibe from `reference/design-system.md`. Don't default to
   blue-on-white.

2. **Create + build in one call** (a new design starts with one blank A4 page;
   pass an initial `tools` array to populate it). Returns `designId` and per-tool
   `results`:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" create '{"name":"Invoice","tools":[
     {"tool":"add_elements","input":{"elements":[
       {"id":"title","type":"text","position":{"x":50,"y":50,"w":300,"h":30},
        "data":{"content":"Invoice #1042"},"styles":{"fontSize":24,"bold":true}},
       {"id":"items","type":"table","position":{"x":50,"y":120,"w":495,"h":160},
        "data":{"rows":4,"columns":4,"template":"headerRow","headerRow":true}}
     ]}},
     {"tool":"bind_variables","input":{"bindings":[
       {"nodeId":"title","field":"content","type":"text","name":"invoice_title"}
     ]}}
   ]}'
   ```

3. **Refine** with `patch` (e.g. `update_elements` to set table cells). Each call
   is **atomic** — if any tool/item fails, nothing is saved and the error names
   the failing tool/index.

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

- Always create with a meaningful `name` first.
- Lay out the whole page in ONE `add_elements` call when you can.
- Build top-to-bottom; keep a consistent spacing rhythm (see `design-system.md`).
- Tables: create structure in `add_elements` (`rows`/`columns`/`template`), then
  set cell text via `update_elements` `data.cells` (`TableCell[][]`, counts
  matching rows × columns).
- Make fillable fields with `bind_variables`; each variable `name` is the key the
  generation step fills.

When the design looks right, hand off to **`imaginepdf:generate`** to produce the
PDF (single, or one-per-row from a dataset).
