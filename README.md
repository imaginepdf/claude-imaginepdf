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

Provide your workspace API key (`pc_live_…`, from the dashboard →
**Settings → API Keys**) one of two ways:

**Export it before you start Claude** — the simplest path:

```bash
export IMAGINEPDF_API_KEY=pc_live_...
claude
```

Set it in the shell **before** launching Claude — a session that's already
running won't pick up a later `export`. Add it to your shell profile (or a
project `.env` you source) to keep it around.

**Or store it in your OS keychain** via `/plugin` → **ImaginePDF** →
**API key** — set once, persists across sessions.

For local dev against a non-production API, also export
`IMAGINEPDF_API_URL=http://localhost:3100`.

## Usage

Ask Claude to create a document:

```
Create an invoice for Acme Corp, invoice #1042, dated today, for 3 items:
Widget A ($50 x 2), Widget B ($75 x 1), Widget C ($30 x 5). Add a QR code
linking to the payment page, and make the customer name a template variable.
```

Or invoke a skill directly:

```
/imaginepdf:create Generate a certificate of completion for "John Doe"
```

## Skills

| Skill | Purpose |
| --- | --- |
| `imaginepdf:create` | Entry point — orchestrates authoring + generation |
| `imaginepdf:design-authoring` | Create/edit a design via tree ops (+ reference docs) |
| `imaginepdf:pdf-generation` | Render a design to a PDF, fill template variables |

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
