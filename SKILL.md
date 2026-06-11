---
name: htmlify
description: Create self-contained HTML artifacts from agent or repo context, including operator briefs, build plans, implementation maps, PR/release packets, incident timelines, decision briefs, reports, explainers, diagrams, prototypes, and lightweight editors. Use when the user asks to turn dense text, code evidence, plans, reviews, or status into browser-ready HTML instead of a markdown wall.
compatibility: Works in agentskills.io-compatible clients. Optional Pi/OMP extension runtime is in index.js and requires Node 20+.
metadata:
  version: "0.3.1"
  source: "https://github.com/zakelfassi/htmlify"
---

# htmlify

Use HTML when the answer needs shape, scanning, comparison, annotation, print/PDF sharing, or browser-native interaction. Produce a single `.html` file by default.

## Operating Rules

1. Gather evidence first. Read the repo, docs, git state, PR/CI/deploy state, logs, screenshots, or supplied source material needed for the artifact. Mark uncertain claims as `needs verification`.
2. Pick the smallest artifact mode that fits the request:
   - `operator-brief`: what happened, what is next, blockers, risks, attention.
   - `build-plan`: problem, target shape, phases, owners, validation, rollback.
   - `implementation-map`: modules, files, data flow, hot path, edit sequence.
   - `pr-review-packet`: motivation, before/after, diff tour, reviewer checklist.
   - `release-brief`: PRs, checks, deploy state, proof, rollback.
   - `incident-report`: impact, timeline, root cause, mitigations, follow-ups.
   - `decision-brief`: options, tradeoffs, recommendation, decision needed.
   - `status-report`: shipped, slipped, carryover, blockers, next period.
   - `explainer`: concept, request path, examples, glossary, FAQs.
   - `prototype` or `editor`: clickable flow, tuning panel, triage board, or exportable UI.
3. Make the artifact visual before verbose. Prefer cards, lanes, timelines, matrices, charts, diagrams, annotated diffs, tabs, accordions, and compact tables over long paragraphs.
4. Keep it self-contained. Inline CSS and JS; no external fonts, CDNs, assets, analytics, or build step unless the user explicitly asks.
5. Make it operator useful. The first viewport should reveal the subject, current status, and where attention should go.
6. Keep copy tight. Labels, numbers, and short evidence-backed statements beat generic prose.
7. Include print CSS for artifacts intended to share, archive, or export as PDF.
8. Add keyboard navigation for deck-style artifacts.
9. Make mobile acceptable, but optimize dense operational artifacts for desktop review.
10. When an image, screenshot, figure, or thumbnail references a link, article, documentation page, post, paper, dashboard, or source page, attach the source in the visible caption/ref near the image. Prefer a caption anchor such as `Source: <a href="...">Exact source title</a>` or weave the linked title into the caption. Do not leave source URLs only in hidden metadata.
11. Validate before final response: doctype, standalone `<html>`/`<body>`, no missing local assets, expected sections, source-linked captions for referenced images, and no obvious layout overlap.

## HTML Shape

Use semantic structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Exact Artifact Title</title>
  <style>
    /* Inline, responsive, print-aware CSS. */
  </style>
</head>
<body>
  <main>
    <section aria-labelledby="title">
      <p class="eyebrow">Mode / repo / date</p>
      <h1 id="title">Exact subject</h1>
    </section>
  </main>
</body>
</html>
```

Use restrained, purposeful UI. Avoid generic purple gradients, decorative blobs, nested cards, huge marketing heroes for operational work, and filler copy that restates headings.

## Recommended Sections

For most operator/build artifacts:

1. Title: exact subject, date, repo/branch/environment.
2. Scoreboard: green/yellow/red status cards.
3. What changed: timeline or shipped cards.
4. System shape: flow, module map, ownership lanes, or annotated diff.
5. On deck: next actions with owner/context/gate.
6. Risks and blockers: severity, evidence, mitigation, decision needed.
7. Better next time: process, architecture, or product improvements.
8. Alpha: non-obvious learning worth preserving.
9. Validation: tests, deploy proof, manual checks, gaps.
10. Closeout: next focus and stop/continue/kill recommendation.

## Rich Artifact Patterns

Load [references/htmlify-principles.md](references/htmlify-principles.md) when the artifact needs deeper mode selection, design guidance, or examples inspired by the HTML effectiveness catalogue.

Load [references/agent-integrations.md](references/agent-integrations.md) when the user asks how to install htmlify into Codex, Claude Code, Cursor, Windsurf, Aider, Pi/OMP, or other coding agents, or asks for hook-based automatic long-answer export.

Use these modules when useful:

- Scoreboard cards for state, counts, proof, blockers.
- Timeline for discovery, fix, validation, deploy, follow-up.
- Swimlanes for frontend/backend/infra/test/docs ownership.
- Dependency graph for modules, services, and hot paths.
- Risk matrix for issue, evidence, severity, owner, mitigation.
- File tour for path, change, why it matters, validation.
- Decision panel for options, tradeoffs, recommendation.
- Review annotation layer for comments, evidence, and follow-up prompts.
- Lightweight editor when the user needs to manipulate ordering, flags, prompts, or triage state and export the result.

## Final Response

Report the HTML file path, artifact mode, evidence sources checked, and validation performed. State any verification not run.

If using the bundled Pi/OMP runtime, see [README.md](README.md) for `/htmlify` commands and install paths.
