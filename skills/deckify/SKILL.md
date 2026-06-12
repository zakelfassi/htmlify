---
name: deckify
description: Create self-contained HTML presentation decks and companion downloadable guides for content creators, educators, technical talks, YouTube lives, workshops, explainers, launch narratives, and media-rich essays. Use when the user wants a presentable deck, speaker notes, run-of-show, demo plan, PDF/guide output, image-generation plan, or screenshot-backed visual narrative rather than a flat markdown answer.
compatibility: Works in agentskills.io-compatible clients. Part of the htmlify skill family; specialized for media-rich deck/guide production.
license: Apache-2.0
metadata:
  version: "1.0.0" # x-release-please-version
  source: "https://github.com/zakelfassi/htmlify"
---

# deckify

Deckify turns dense context into a browser-ready HTML deck plus a downloadable guide. It is an off-the-shelf content-creator skill: the output should be usable for a YouTube talk, live workshop, recorded lecture, webinar, internal enablement session, or publishable companion PDF.

Deckify generates **HTML** by default. It extends its sibling skill `htmlify` with:

- deck-first narrative structure
- speaker notes and detachable notes
- run-of-show and chapter timing
- demo/lab panels
- downloadable guide/PDF mode
- 40-60% visual coverage planning
- image-generation illustration slots
- browser screenshot capture when useful for visual references
- validation for presentation and print/download use

## Operating Rules

1. Gather evidence first. Read the supplied source, repo files, docs, screenshots, existing deck/page, or prior artifact before designing the deck.
2. Choose the smallest deck mode that fits:
   - `talk-deck`: YouTube/live presentation with speaker notes and run-of-show.
   - `workshop-deck`: talk plus exercises, labs, checkpoints, and handouts.
   - `essay-deck`: presentation plus downloadable long-form guide.
   - `demo-deck`: presentation centered around live demos and fallback screenshots.
   - `launch-deck`: product narrative, proof, risks, roadmap, and CTA.
   - `teaching-guide`: PDF-first guide with optional slide mode.
3. Keep the output self-contained unless the user explicitly wants external assets. Inline CSS and JS. If generated images or screenshots are used, save them into the project and reference them locally.
4. Make the first viewport presentation-ready: title, promise, audience, timing, and navigation controls.
5. Add speaker notes for every substantive slide. Include detachable notes when the deck is for live presentation.
6. Include a run-of-show with timestamps and chapter labels for YouTube.
7. Include a guide/PDF mode when the user asks for a download, companion essay, handout, or post-watch material.
8. Aim for 40-60% visual coverage for content decks unless the user asks for a text-only brief. Count full-slide visuals, companion graphics, screenshots, diagrams, demos, charts, and worksheet panels.
9. Use visuals to clarify systems, flows, tradeoffs, proof, or examples. Do not add decorative stock-like images.
10. When an image, screenshot, or figure references a link, article, documentation page, post, paper, or source screenshot, put the source in the visible caption/ref near the image (e.g. `Source: <a href="...">Exact source title</a>`). Do not leave source URLs only in a hidden manifest.
11. Validate before final response: standalone HTML, keyboard navigation, notes, guide/print mode, media references, visual coverage, and no obvious layout overlap.

## Visual Direction

Default to the **Hardcopy** design system in its deck tempo: paper-field slides, serif display headlines (one idea per slide), mono-uppercase metadata, a compressed plate footer with slide number and progress, one international-orange accent for the active state, and carbon (dark) surfaces for presenter chrome and speaker notes so chrome never competes with the slide. Load [references/hardcopy.md](references/hardcopy.md) for tokens, devices, and print rules before styling.

When the project supplies `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, brand tokens, or an existing design system, treat them as authoritative over Hardcopy.

## Image Generation Workflow

Use an image-generation skill or tool (if one is available in the environment) when the deck or guide benefits from AI-created bitmap visuals:

1. Generate images as reusable slide/guide assets. Prefer 16:9 landscape for slides and 4:3 or wide worksheet panels for guides.
2. For project-bound assets, move or copy selected outputs into the workspace and reference them locally; never reference only a tool's temporary output path.
3. Avoid embedded text in generated images unless exact text is essential. Put labels and explanations in HTML captions.
4. Store the final prompt near the consuming markup: `data-imagegen-prompt="..."`, an adjacent source manifest, or a `visuals.md`/`visuals.json` file when there are many assets.
5. Inspect generated images before using them. Check subject, style, readability, text artifacts, composition, and whether the asset supports the point.
6. If image generation is rate-limited or unavailable, do not draw SVG illustration substitutes for what should be a bitmap. Surface the blocker clearly, keep a non-illustrated pending visual slot with `data-imagegen-prompt`, and report that generated bitmap creation remains pending. (Deterministic system diagrams as inline SVG are always fine — this rule is about illustrations.)

Recommended prompt scaffold:

```text
Use case: scientific-educational
Asset type: slide and PDF companion illustration
Primary request: <specific concept>
Visual style: flat technical-plate illustration, warm paper field, dark ink linework,
hairline structure, a single international-orange accent, schema-like boxes and arrows.
Composition: <full slide / companion graphic / worksheet panel>
Text policy: no readable embedded text; captions and labels will be in HTML.
Avoid: photorealism, glossy gradients, stock-photo look, logos, decorative blobs, tiny illegible labels.
Aspect: 16:9 landscape unless guide-specific.
```

## Screenshot Workflow

Use browser automation/screenshot tooling (whatever the environment provides) when the visual would be stronger with real evidence:

- Capture screenshots of documents, dashboards, tools, traces, eval reports, product screens, source docs, or demo states when they help explain or prove the talk.
- Redact sensitive data before publishing. Do not capture credentials, private user data, inbox content, tokens, secrets, or tenant data unless explicitly approved.
- Save screenshots into the project and reference them locally. Include source URL/file, capture date, and any redaction note.
- If screenshot tooling is unavailable, use deterministic diagrams or mark screenshot capture as pending rather than inventing evidence.

## HTML Deck Shape

Use one HTML file with deck and guide modes. The full contract — required DOM, keyboard handler, notes panel, guide mode, print rules, and what the validator checks — is in [references/deck-template.md](references/deck-template.md). Skeleton:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Exact Talk Title</title>
  <style>
    /* Inline, responsive, print-aware CSS. */
  </style>
</head>
<body>
  <header class="topbar">
    <!-- deck controls, progress, notes, guide/print -->
  </header>
  <main class="deck-shell">
    <section class="slide active" data-title="Opening">
      <!-- slide content -->
      <aside class="notes">...</aside>
    </section>
  </main>
  <aside class="notes-panel">...</aside>
  <article class="guide">
    <!-- downloadable guide/PDF companion -->
  </article>
  <script>
    /* keyboard navigation, notes, guide mode, print */
  </script>
</body>
</html>
```

## Validate the Deck

Before the final response, run the bundled validator with the deck profile:

```bash
npx -y @zakelfassi/htmlify htmlify-answer --validate path/to/deck.html --profile deck
```

From a repo or plugin checkout, use `node <checkout>/bin/htmlify-answer.js` (in Claude Code plugin context: `node "${CLAUDE_PLUGIN_ROOT}/bin/htmlify-answer.js"`). The deck profile checks standalone structure, slide sections, keyboard navigation, speaker notes on substantive slides, script safety, external-asset bans, and size. Fix every reported error before responding; report remaining warnings. If the validator cannot run in the environment, perform the checklist below manually and say so.

## Recommended Sections

For most talk artifacts:

1. Opening title: audience, promise, duration, core thesis.
2. Cold open or problem story.
3. Mental model or map.
4. Main teaching acts, each with 2-4 slides.
5. Tradeoff matrices or decision tables.
6. Live demo or prepared demo section.
7. Failure modes and how to detect them.
8. Run-of-show with timestamps.
9. Closing checklist.
10. Downloadable guide: summary, modules, exercises, checklist, sources.
11. Source shelf and verification notes.

## Slide Rules

- One idea per slide.
- Use big claims sparingly and support them with diagrams, tables, proof, or demos.
- Keep slide text presentable at 1080p and readable in a YouTube player.
- Put extra explanation in speaker notes or guide mode.
- Every slide should have a reason to exist in the spoken arc.
- Every visual should either explain a system, compare options, show proof, or create a memory hook.

## Guide/PDF Rules

- The guide is not a transcript. It should be useful after the video.
- Include summaries, exercises, checklists, references, and implementation heuristics.
- Print CSS must hide deck controls and print the guide.
- Links should be visible and useful. For offline handouts, include source titles and dates when relevant.

## Validation Checklist

Run lightweight validation before final response (the `--profile deck` validator covers the structural items automatically):

- HTML parser accepts the file.
- Embedded JavaScript syntax checks.
- Exactly one `<html>` and one normal `<body>` tag.
- Slide count is intentional.
- Speaker notes exist for each substantive slide.
- Guide/PDF mode exists when requested.
- Print CSS exists for guide/download artifacts.
- Visual coverage is counted and is roughly 40-60% when requested.
- Every local image/screenshot reference exists.
- Every image that references a link, post, doc, paper, or screenshot source has a visible source link in its caption/ref.
- No external fonts, CDNs, analytics, or remote assets unless approved.
- Screenshot capture was used when useful and available, or its absence is reported.
- Image generation was used for bitmap visuals when available, or pending slots are marked with prompts without SVG illustration substitutes.

## Final Response

Report:

- HTML file path.
- Artifact mode.
- Slide count, visual coverage, and guide/PDF status.
- Generated-image outputs or pending prompt slots.
- Screenshot sources used, or why they were not used.
- Validation performed (including the validator command and result) and any remaining gaps.
