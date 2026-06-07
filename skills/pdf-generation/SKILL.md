---
name: pdf-generation
description: Generate a rendered PDF from an existing ImaginePDF design, optionally filling template variables with values. Use when the task is to produce a downloadable PDF from a design that already exists.
allowed-tools: Bash(node *)
---

# ImaginePDF — PDF generation

Render an existing design to a PDF and return its download URL. If you need to
create or change the design first, use `imaginepdf:design-authoring`.

## Generate

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/generate.cjs" generate '{"designId":"<id>"}'
```

With template variable values (`data` keyed by variable **name** — the names
bound via the design-authoring `bindVariable` op, shown in the design's API
panel):

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/generate.cjs" generate '{
  "designId":"<id>",
  "data":{
    "customer_name":"Acme Corp",
    "items_table":[["Item","Qty","Price"],["Widget","5","$50.00"]]
  }
}'
```

- `data` is optional; omit it to render the design as-is.
- Text/qr/barcode/image variables take a string value. Table variables take a
  native 2-D string array (`string[][]`), one inner array per row — NOT a
  JSON-encoded string.
- A value's key must match a bound variable's name exactly. Unknown keys are
  ignored; the field renders its static content.

## Result

The script returns `{ designId, filename, downloadUrl, expiresIn, status }`.
Give the user the `downloadUrl` — it is a presigned link that expires in about
an hour. Generation costs one credit per PDF.
