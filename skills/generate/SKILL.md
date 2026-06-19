---
name: generate
description: Generate a rendered PDF from an existing ImaginePDF design — either a single PDF, or one PDF per row of a dataset (batch). Optionally fills template variables with values. Use when a design already exists and the task is to produce downloadable PDF output. To create or change the design first, use `imaginepdf:design`.
allowed-tools: Bash(node *)
---

# ImaginePDF — Generate

Render an existing design to a PDF and return its download URL. If you need to
create or change the design first, use `imaginepdf:design`.

Values (`data` for single, each `rows[]` entry for batch) are keyed by variable
**name** — the names bound via the design `bind_variables` op (shown in the
design's API panel). Run `imaginepdf:design`'s `design.cjs tree` to see them.

## Single PDF

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/generate.cjs" generate '{"designId":"<id>"}'
```

With template variable values:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/generate.cjs" generate '{
  "designId":"<id>",
  "data":{
    "customer_name":"Acme Corp",
    "greeting":{"first_name":"Jane","plan":"Pro"},
    "items_table":[["Item","Qty","Price"],["Widget","5","$50.00"]]
  }
}'
```

- `data` is optional; omit it to render the design as-is.
- Text/qr/barcode/image variables take a string value. Table variables take a
  native 2-D string array (`string[][]`), one inner array per row — NOT a
  JSON-encoded string. A malformed table value (not an array, a row that
  isn't an array, or more than 500 rows) FAILS the generation with a clear
  400 (single) / per-row reason (batch) — it never silently renders the
  design's placeholder cells. A `null` cell renders as an empty cell.
- **Inline placeholders:** if a text element (or table cell) embeds `{{token}}`
  placeholders, pass that variable an OBJECT mapping each token to its value —
  e.g. `"greeting":{"first_name":"Jane","plan":"Pro"}`. Each `{{token}}` is
  replaced in place and the surrounding static text is kept; unfilled tokens
  render empty. Token names are letters, digits, and underscore (no spaces,
  periods, or hyphens); `page`/`pages` are reserved. A variable with NO `{{}}`
  tokens still takes a string (or
  `string[][]` for a whole table). You cannot style individual tokens.
- A value's key must match a bound variable's name exactly. Unknown keys are
  ignored; the field renders its static content.

Returns `{ designId, filename, downloadUrl, expiresIn, status }`. Give the user
the `downloadUrl` — a presigned link that expires in about an hour. One credit
per PDF.

## Batch (one PDF per row of a dataset)

`rows` is an array of objects, each keyed by variable name — one PDF per row.
Requires the workspace's plan to include batch generation.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/generate.cjs" batch '{
  "designId":"<id>",
  "rows":[
    {"customer_name":"Acme Corp","items_table":[["Item","Qty"],["Widget","5"]]},
    {"customer_name":"Globex Inc","items_table":[["Item","Qty"],["Gadget","2"]]}
  ]
}'
```

Returns `{ jobId, status, total, designId }` — the job runs asynchronously.
Poll it, then fetch the zip:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/generate.cjs" batch-status   '{"jobId":"<jobId>"}'
node "${CLAUDE_PLUGIN_ROOT}/scripts/generate.cjs" batch-download '{"jobId":"<jobId>"}'
```

`batch-status` reports progress (`completed` / `total`); once complete,
`batch-download` returns a presigned URL for the zipped PDFs. One credit per row.
