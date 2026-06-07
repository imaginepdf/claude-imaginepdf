# Changelog

All notable changes to the ImaginePDF plugin are documented here. The plugin
follows [semantic versioning](https://semver.org); bump `version` in
`.claude-plugin/plugin.json` on every release.

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
