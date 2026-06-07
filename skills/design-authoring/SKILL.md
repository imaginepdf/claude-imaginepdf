---
name: design-authoring
description: Author or edit an ImaginePDF design — create a design, then build its layout by calling authoring tools (add pages and elements, position/style them, bind template variables). Use when the task is to create a new document layout or change an existing one.
allowed-tools: Bash(node *), Read
---

# ImaginePDF — Design authoring

You build a design by calling **authoring tools**. Each tool call is
`{ tool, input }`; the server (pdftreejs — the tool authority) applies the batch
to the design's node tree and persists it. You never construct raw tree JSON —
you describe intent with tools.

The element + variable tools are **list-native**: one `add_elements` call lays
down MANY elements at once (and `update_elements` / `remove_elements` /
`bind_variables` likewise take arrays). Prefer one bulk call over many singular
ones. You can pass tools to `create` (build in one request) or `patch` (edit an
existing design) — both take a `tools` array.

**Before authoring**, get the authoritative tool catalog (names + input shapes)
and skim the cheat-sheet:
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" tools` — live catalog.
- `${CLAUDE_PLUGIN_ROOT}/skills/design-authoring/reference/README.md` — units,
  addressing, and stable conventions.

## Workflow

1. **Create + build in one call** (a new design starts with one blank A4 page;
   pass an initial `tools` array to populate it immediately). Returns `designId`
   and per-tool `results`:
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
   Or create empty and build later with `patch '{"designId":"<id>","tools":[…]}'`
   — same `tools` shape. Each call persists immediately.

2. **Refine** with `patch` (e.g. `update_elements` to set table cells):
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" patch '{"designId":"<id>","tools":[
     {"tool":"update_elements","input":{"updates":[
       {"id":"items","data":{"cells":[
         [{"type":"text","data":{"content":"Item"}},{"type":"text","data":{"content":"Qty"}}],
         [{"type":"text","data":{"content":"Widget"}},{"type":"text","data":{"content":"2"}}]
       ]}}
     ]}}
   ]}'
   ```
   Address each element with a stable `id` you choose; reference it in later
   items/calls. Every call is **atomic** — if any tool (or any item within a
   tool) fails, nothing is saved and the error names the failing tool/index.

3. **Review** before finishing:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/design.cjs" get '{"designId":"<id>"}'
   ```
   `config` is the full tree; `variables` lists bound template variables.

## Guidance

- Always create with a meaningful `name` first.
- Lay out the whole page in ONE `add_elements` call (an `elements[]` array) when
  you can — it's far more compact than many singular calls.
- Build top-to-bottom; ~20–30 pt gaps between sections. Title 22–28 pt, section
  header 14–16 pt, body 10–12 pt. Body color `#333333`, accent e.g. `#2563EB`.
- Tables: create structure in `add_elements` (`rows`/`columns`/`template`), then
  set cell text via `update_elements` `data.cells` (`TableCell[][]`, counts
  matching rows × columns).
- Make fields fillable with `bind_variables`; each variable `name` is the key the
  generation step fills.
- After building, always `get` to verify before handing off or generating.
