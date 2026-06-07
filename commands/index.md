---
description: Create a PDF document with ImaginePDF — invoice, receipt, certificate, report, letter, or any custom layout
allowed-tools: Bash(node *)
---

Create a professional PDF document with ImaginePDF.

Use $ARGUMENTS to understand what the user wants. Examples:
- "an invoice for Acme Corp, 3 widgets at $50"
- "receipt for coffee shop order"
- "certificate of completion for Jane Smith"
- "quarterly sales report"
- "business letter to a client"

If $ARGUMENTS is empty or unclear, ask the user what document they'd like to create.

Follow the `create` skill: author the layout with `imaginepdf:design-authoring`,
then render it with `imaginepdf:pdf-generation`, and return the download URL.
