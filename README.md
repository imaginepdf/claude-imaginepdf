# ImaginePDF plugin for Claude Code

Create professional PDFs — invoices, receipts, certificates, reports, letters —
directly from Claude Code with [ImaginePDF](https://imaginepdf.com).

## What it does

- **Author designs** — build a document layout from a description: positioned
  text, tables, images, shapes, QR codes, and barcodes across one or more pages.
- **Bind template variables** — mark fields fillable so the same design can be
  reused with different data.
- **Generate PDFs** — render a design to a downloadable PDF, optionally filling
  variables with values.

A common flow: author a base template here, open it in the ImaginePDF web editor
to refine, then generate copies via the API or a dataset.

## Prerequisites

- [Claude Code](https://claude.com/claude-code)
- An ImaginePDF workspace and a workspace **API key**
  (dashboard → **Settings → API Keys**). The workspace's plan must include API
  access.

## Installation

From the GitHub marketplace:

```
/plugin marketplace add imaginepdf/claude-imaginepdf
/plugin install imaginepdf@imaginepdf
```

Local development:

```bash
claude --plugin-dir /path/to/claude-imaginepdf
```

## Setup

Export your workspace API key (`pc_live_…`, from the dashboard →
**Settings → API Keys**) **before** you launch Claude — a session that's already
running won't pick up a later `export`:

```bash
export IMAGINEPDF_API_KEY=pc_live_...
claude
```

Add it to your shell profile (or a project `.env` you source) to keep it around.
For local dev against a non-production API, also export
`IMAGINEPDF_API_URL=http://localhost:3100`.

## Usage

Just ask Claude in plain English:

```
Create a detailed invoice for Acme Corp, invoice #1042, dated today, for 3
items: Widget A ($50 x 2), Widget B ($75 x 1), Widget C ($30 x 5). Add a QR
code linking to the payment page, and make the customer name a template variable.
```

Claude designs the layout, checks its own preview, and hands back the PDF —
saved to your workspace, ready for the editor or the API.

## Skills

Claude picks the right skill up from your request — you don't invoke them by hand:

| Skill | What it does |
| --- | --- |
| `imaginepdf:design` | Author or edit a layout — elements, styling, template variables |
| `imaginepdf:generate` | Render the design to a PDF, single or batch from a dataset |

## Architecture

```
Claude Code  →  ImaginePDF plugin  →  ImaginePDF API  /api/v1  (X-API-Key)
                (design.cjs/generate.cjs)   (validates, applies tree ops, renders)
```

The plugin is a thin CLI over the public ImaginePDF API. The API owns and
executes the authoring **tools**; the plugin sends batches of tool calls and
reads back results. Endpoints used:

- `POST /api/v1/designs` — create a design
- `GET /api/v1/designs` — list designs
- `GET /api/v1/designs/:id` — get a design + tree
- `PATCH /api/v1/designs/:id` — apply a batch of authoring tools / rename / describe
- `GET /api/v1/tools` — the authoring tool catalog
- `POST /api/v1/generate?design=:id` — render a PDF
