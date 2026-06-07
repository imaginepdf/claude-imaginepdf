---
name: create
description: Create and generate PDF documents (invoices, receipts, certificates, reports, letters) with ImaginePDF. Designs are authored as positioned elements — text, tables, images, shapes, QR codes, barcodes — then rendered to a PDF. Use this to design a document from a description and produce a downloadable PDF.
allowed-tools: Bash(node *)
---

# ImaginePDF

You create professional PDFs with ImaginePDF: author a **design** (a tree of
positioned elements on one or more pages), then **generate** a rendered PDF.

This is the entry point. Two focused sub-skills do the real work:

- **`imaginepdf:design-authoring`** — create a design and build/edit its layout
  (add pages and elements, style them, bind template variables). Start here for
  anything that creates or changes a document's content or layout.
- **`imaginepdf:pdf-generation`** — render an existing design to a PDF, optionally
  filling template variables with values.

A typical session: author a base design here, then the user opens it in the
ImaginePDF web editor to refine, and generates copies via the API or a dataset.

**CRITICAL RULES**
- Build and render PDFs ONLY through the ImaginePDF scripts in these skills.
  Never use Python, pdf-lib, LaTeX, headless browsers, or any other PDF method.
- If a script returns an error, surface it to the user. Do NOT fall back to an
  alternative approach.

## Scripts

All scripts are invoked as:
`node "${CLAUDE_PLUGIN_ROOT}/scripts/<script>.cjs" <subcommand> '<json>'`

| Script | Subcommands | Used by |
| --- | --- | --- |
| `design.cjs` | `tools` · `create` · `get` · `list` · `patch` | design-authoring |
| `generate.cjs` | `generate` | pdf-generation |

## Setup

Auth is a workspace **API key** sent on `X-API-Key`. Configure it once via
`/plugin` → ImaginePDF (the key is stored in your OS keychain; the API base URL
defaults to production, set `http://localhost:3100` for local dev). Create a key
in the ImaginePDF dashboard: **Settings → API Keys**.

## Flow

1. **Author** — follow `imaginepdf:design-authoring`:
   `design.cjs tools` (discover the catalog) → `design.cjs create` → one or more
   `design.cjs patch` calls (tool batches) → `design.cjs get` to review.
2. **Generate** — follow `imaginepdf:pdf-generation`:
   `generate.cjs generate` → return the download URL to the user.
