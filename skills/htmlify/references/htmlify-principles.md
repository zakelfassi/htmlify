# htmlify Principles

Use this reference when `SKILL.md` is not enough to choose a format or design the artifact.

## Source Philosophy

htmlify combines:

- HTML Operator Brief: evidence-first single-file visual artifacts for build, review, release, incident, decision, and status work.
- The unreasonable effectiveness of HTML: HTML replaces markdown when the work is visual, spatial, comparative, interactive, or reusable in the browser.
- Pi/OMP long-answer export: the source answer remains intact; export is explicit; generated HTML is treated as untrusted until validated.

## When HTML Is Better Than Markdown

Choose HTML when at least one of these is true:

- The reader needs to compare options, diffs, designs, risks, timelines, or plans side by side.
- The work has a shape: architecture, flow, ownership, dependencies, lifecycle, incident timeline.
- The artifact will be reviewed in a meeting, printed to PDF, archived, or handed to another implementer.
- The user benefits from interaction: tabs, filters, toggles, collapsible detail, comments, drag/drop ordering, copy/export buttons.
- The output can become a reusable local tool rather than a static answer.

Stay in markdown when the answer is short, linear, or command-like.

## Artifact Families

### Exploration And Planning

Use side-by-side approaches, visual directions, or an implementation plan with milestones, data flow, risky code, gates, and rollback.

### Code Review And Understanding

Use annotated diffs, module maps, file tours, call graphs, reviewer focus lists, severity tags, and jump links.

### Design

Render tokens, swatches, type scales, spacing systems, component variants, states, and accessibility notes as live surfaces.

### Prototyping

Build small clickable flows or animation sandboxes only when interaction changes the decision. Include exportable state when the prototype is an editor.

### Diagrams

Use inline SVG for flowcharts, architecture maps, lifecycle diagrams, and figure sheets. Keep labels readable and avoid decorative complexity.

### Decks

Use `<section>` slides with arrow-key navigation, progress, print CSS, and dense meeting-ready copy.

### Research And Learning

Use explainers with TL;DR boxes, collapsible path steps, tabbed code samples, examples, glossary, and FAQ.

### Reports

Use status cards, small charts, timelines, proof snippets, shipped/slipped/carryover columns, and next-action boards.

### Custom Editors

Use local-only UI when the user needs to manipulate data: triage boards, feature-flag editors, prompt tuners, ordering tools, or planning matrices. Always include a copy/export button.

## Design Register

Pick the register before colors:

- `operational`: dense, scannable, restrained, proof-forward.
- `product`: efficient repeated use, clear controls, stable states.
- `brand`: image-led or object-led, strong first viewport, memorable but not noisy.
- `learning`: calm hierarchy, examples, progressive detail, glossary.

Avoid one-note palettes, generic purple SaaS styling, nested cards, decorative blobs, and text that explains the interface instead of doing useful work.

## Validation Checklist

- Standalone `<!DOCTYPE html>` document with `<html>`, `<head>`, and `<body>`.
- Inline CSS and JS only unless user approved external assets.
- No scripts in rich model output unless the task truly requires local interactivity and the script is authored directly in the artifact.
- No external asset references for portable operator artifacts.
- Keyboard support for decks and editors.
- Print CSS for briefs, reports, plans, and decks.
- Responsive layout with no horizontal overflow at mobile width.
- Long labels and long words do not overflow buttons, cards, or tables.
- Every status, risk, and claim has evidence or is marked `needs verification`.
