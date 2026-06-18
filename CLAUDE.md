# claude-imaginepdf

Open-source Claude Code plugin that lets Claude design + generate PDFs
(invoices, receipts, certificates, reports, letters) from any Claude Code
session via the ImaginePDF public API.

**Brand:** user-facing copy is **ImaginePDF**. The plugin's manifest `name` is
`imaginepdf` — it is the slash namespace. There are exactly two skills:
`/imaginepdf:design` (author/edit a layout) and `/imaginepdf:generate` (render a
PDF, single or batch). `displayName` is "ImaginePDF". Keep it to these two —
extra skills trigger repeated permission prompts.

**Open source:** this repo is public. Do NOT bundle the proprietary `pdftreejs`
package here. The plugin only carries hand-written schema/design reference docs
(under `skills/design/reference/`) so Claude can emit correct action payloads and
tasteful layouts; the server owns `pdftreejs` and applies the actions.

## Layout

```
claude-imaginepdf/
├── .claude-plugin/
│   ├── plugin.json            # manifest (no userConfig — key comes from env)
│   └── marketplace.json       # GitHub marketplace catalog (this repo)
├── src/
│   ├── design.ts              # actions/fonts/create/get/tree/list/patch/update + preview/upload
│   ├── generate.ts            # render a PDF + batch (generate/batch/batch-status/batch-download)
│   └── lib/
│       ├── auth.ts            # resolve API key + base URL from IMAGINEPDF_API_KEY/_URL env
│       └── api-client.ts      # X-API-Key HTTP client (get/post/patch/postForm/putForm/download)
├── skills/
│   ├── design/                # author/edit layout (/imaginepdf:design)
│   │   └── reference/         # README (action conventions), design-system.md, gallery/*.json
│   └── generate/              # render + dynamic field values, single + batch
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

- `POST  /api/v1/designs` — create a design (name + optional description +
  paper format `size` (A4|A3|A5|Letter|Legal, default A4) + `orientation`
  (portrait|landscape, default portrait) → `designId`). The first page is
  materialized at create with those dimensions (how a landscape/A3 design is
  made). It does NOT accept element `actions` (sending them is rejected) —
  authoring is a separate concern, see PATCH below.
- `GET   /api/v1/designs` — list designs
- `GET   /api/v1/designs/:id` — design METADATA (name/description/timestamps; NOT the tree)
- `GET   /api/v1/designs/:id/tree` — the full design tree as RAW JSON (unwrapped)
- `PATCH /api/v1/designs/:id` — rename / re-describe (metadata only; never the tree)
- `PATCH /api/v1/designs/:id/tree` — apply an ordered batch of authoring **actions**.
  Each action is `{type, args}` and SINGULAR (one element / one binding / one page
  op): `add_element`, `update_element`, `remove_element`, `reorder_element`,
  `bind_variable`, `unbind_variable`, `add_page`, `update_page`, `remove_page`,
  `set_page_background`, `set_document_background`, `set_metadata`. Applied
  sequentially (`tree + action → tree`), atomically. Text/table sizes are DERIVED
  server-side (text `{x,y,maxWidth?}`, table grid-driven); element ids are
  server-minted — agents address elements by their unique `name`
- `GET   /api/v1/actions` — the authoring action catalog (types + args shapes)
- `GET   /api/v1/designs/:id/preview?page=0` — render a page to a PNG (no credit)
- `POST  /api/v1/uploads` — upload an image (multipart, ≤1 MB) → `uploads:<id>`
- `POST  /api/v1/designs/:id/generate` — render a PDF, returns a presigned `downloadUrl`
- `POST  /api/v1/designs/:id/batch` — one PDF per row (plan-gated) → `jobId`
- `GET   /api/v1/batches/:jobId` — poll the batch job · `GET …/download` — fetch the zip

The authoring actions are defined and executed server-side by the ImaginePDF API
(the authority); the plugin is a thin caller. Authoring, preview, and image
upload are free; only generation (single and per batch row) costs a credit.

## Config

`auth.ts` resolves the workspace key from the `IMAGINEPDF_API_KEY` env var —
exported BEFORE launching Claude (a running session won't pick up a later
export). There is no `userConfig` / `/plugin` keychain prompt; the env var is the
only path. The base URL defaults to `https://api.imaginepdf.com`; for local dev
export `IMAGINEPDF_API_URL=http://localhost:3100`.

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
  action-based through `PATCH /api/v1/designs/:id/tree`. The old `element.cjs`/`page.cjs`
  called endpoints that never existed.
- Do no bump up the version automatically, that will be set before making a release
- The action catalog is owned server-side and served at `GET /api/v1/actions`
  (via `design.cjs actions`). The plugin's `reference/README.md` is a thin pointer
  to that live catalog — don't hand-maintain a parallel action list here.
- The API-key auth path must remain stable across backend auth refactors — it's
  the only way this plugin authenticates.
