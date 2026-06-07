# claude-imaginepdf

Open-source Claude Code plugin that lets Claude design + generate PDFs
(invoices, receipts, certificates, reports, letters) from any Claude Code
session via the ImaginePDF public API.

**Brand:** user-facing copy is **ImaginePDF**. The plugin's manifest `name` is
`imaginepdf` — it is the slash namespace, e.g. the entry skill is
`/imaginepdf:create`. `displayName` is "ImaginePDF".

**Open source:** this repo is public. Do NOT bundle the proprietary `pdftreejs`
package here. The plugin only carries hand-written schema reference docs (under
`skills/design-authoring/reference/`) so Claude can emit correct op payloads;
the server owns `pdftreejs` and applies the ops.

## Layout

```
claude-imaginepdf/
├── .claude-plugin/
│   ├── plugin.json            # manifest (+ userConfig: api_key, api_base_url)
│   └── marketplace.json       # GitHub marketplace catalog (this repo)
├── src/
│   ├── design.ts              # create / get / list / patch designs (/api/v1)
│   ├── generate.ts            # render a PDF (/api/v1/generate)
│   └── lib/
│       ├── auth.ts            # resolve API key + base URL (userConfig → env)
│       └── api-client.ts      # X-API-Key HTTP client (get/post/patch)
├── skills/
│   ├── create/                # entry/orchestrator skill (/imaginepdf:create)
│   ├── design-authoring/      # op-based authoring + reference/{tree-ops,elements}.md
│   └── pdf-generation/        # render + dynamic field values
├── commands/index.md          # /imaginepdf launcher
├── build/build.js             # esbuild → scripts/{design,generate}.cjs
├── scripts/                   # built CLIs (committed for distribution)
├── CHANGELOG.md
└── package.json
```

## How it talks to the ImaginePDF API

Plugin → the ImaginePDF API over HTTP with `X-API-Key`. The workspace is resolved
server-side from the key — the plugin never sends a workspace id. All calls hit
the versioned, API-key-only public surface:

- `POST  /api/v1/designs` — create a design
- `GET   /api/v1/designs` — list designs
- `GET   /api/v1/designs/:id` — get a design + tree
- `POST  /api/v1/designs` also accepts an optional initial `tools[]` to
  create-and-populate in one request
- `PATCH /api/v1/designs/:id` — apply a batch of authoring **tools** and/or
  rename/describe. Element + variable tools are list-native: `add_elements`,
  `update_elements`, `remove_elements`, `bind_variables`, `unbind_variables`
  (each takes an array); singular: `add_page`, `set_page_background`,
  `set_document_background`, `set_metadata`
- `GET   /api/v1/tools` — the authoring tool catalog (names + input shapes)
- `POST  /api/v1/generate?design=:id` — render a PDF, returns a presigned URL

The authoring tools are defined and executed server-side by the ImaginePDF API
(the authority); the plugin is a thin caller. Authoring is free; only generation
costs a credit.

## Config

Uses Claude Code plugin `userConfig` (set via `/plugin`):
- `api_key` (sensitive → OS keychain) — workspace key `pc_live_…`.
- `api_base_url` — defaults to production; `http://localhost:3100` for dev.

`auth.ts` reads `CLAUDE_PLUGIN_OPTION_API_KEY` / `CLAUDE_PLUGIN_OPTION_API_BASE_URL`
first, then falls back to `IMAGINEPDF_API_KEY` / `IMAGINEPDF_API_URL` for local
dev. The default base URL is `https://api.imaginepdf.com`.

## Distribution

GitHub marketplace lives in this repo (`.claude-plugin/marketplace.json`, name
`imaginepdf`). Install: `/plugin marketplace add imaginepdf/claude-imaginepdf`
then `/plugin install imaginepdf@imaginepdf`. Versioning is explicit semver in
`plugin.json` — bump it on every release and note changes in `CHANGELOG.md`.
Validate with `claude plugin validate .` before publishing. The built
`scripts/*.cjs` are committed (not gitignored) so installs run without a build.

## Dev

```bash
cd claude-imaginepdf
npm install
npm run build         # esbuild → scripts/{design,generate}.cjs
claude --plugin-dir "$(pwd)"
```

## Notes / rules

- Do NOT reintroduce granular element/page endpoints or scripts — authoring is
  tool-based through `PATCH /api/v1/designs/:id`. The old `element.cjs`/`page.cjs`
  called endpoints that never existed.
- The tool catalog is owned server-side and served at `GET /api/v1/tools`
  (via `design.cjs tools`). The plugin's `reference/README.md` is a thin pointer
  to that live catalog — don't hand-maintain a parallel tool list here.
- The API-key auth path must remain stable across backend auth refactors — it's
  the only way this plugin authenticates.
