# Hardcopy — the htmlify visual identity

**Hardcopy** is the default design system for every artifact produced by the htmlify and deckify skills, for the project's own pages, and for the bundled local renderer. The premise: agent output is ephemeral terminal text; an artifact is *stdout, made permanent*. So the visual language is that of printed technical matter — engineering plates, datasheets, drawing title blocks — executed with browser-native precision. Not CRT kitsch. Not SaaS gradients. A document, not an app.

Treat this file as the single source of truth. When a project supplies its own `DESIGN.md`, brand tokens, or design system, those win; otherwise, Hardcopy applies.

## Tokens

Copy this block into every artifact:

```css
:root {
  color-scheme: light dark;
  /* Paper (light) */
  --paper: #faf7f0;
  --surface: #ffffff;
  --ink: #1c1a15;
  --ink-2: #6e6759;
  --rule: #d9d2c3;
  --rule-strong: #1c1a15;
  --signal: #e84b0f;
  --signal-wash: #fbeae1;
  --ok: #2c7a52;
  --warn: #a87514;
  --risk: #b5341b;
  --code-bg: #211e18;
  --code-ink: #e8e2d4;
  --font-display: "Charter", "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif;
  --font-body: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  --font-mono: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    /* Carbon (dark) */
    --paper: #161410;
    --surface: #1e1b16;
    --ink: #ede8dc;
    --ink-2: #a39a88;
    --rule: #3a352b;
    --rule-strong: #ede8dc;
    --signal: #ff6b2c;
    --signal-wash: #3a2114;
    --ok: #5bbe8c;
    --warn: #d9a93e;
    --risk: #e2603f;
    --code-bg: #0e0d0a;
    --code-ink: #d8d2c4;
  }
}
```

Rules of use:

- `--paper` is the page; `--surface` only for panels that must separate from it (sparingly).
- `--signal` (international orange) is the **only** accent. Use it in at most three places per viewport: typically the plate's mode cell, the active nav state, and one emphasis rule. Color restraint is the brand.
- `--ok` / `--warn` / `--risk` are for status semantics only, never decoration.
- Code always sits in a **carbon well**: `--code-bg` background, `--code-ink` text, in both light and dark modes. The terminal lives *inside* the document.

## Type

Three voices, zero downloaded fonts (artifacts must stay self-contained):

| Voice | Stack | Use | Treatment |
| --- | --- | --- | --- |
| Display | `--font-display` (Charter/Georgia serif) | h1–h3, slide headlines, pull numbers | tight: `line-height 1.05–1.15`, `letter-spacing -0.015em`; h1 `clamp(34px, 5vw, 56px)` |
| Body | `--font-body` (system grotesque) | paragraphs, cells, UI | 15–16px / 1.6 |
| Metadata | `--font-mono` | eyebrows, labels, timestamps, paths, plate cells, stamps, slide numbers | uppercase, 11–12px, `letter-spacing 0.08em`, color `--ink-2` |

The metadata voice is the connective tissue to the terminal: *metadata speaks terminal; content speaks document*. Anything that is "about" the artifact (mode, date, source, counts) is mono uppercase. Anything that *is* the artifact is serif/grotesque.

## The seven devices

1. **The Plate.** The signature device: a title block, as on an engineering drawing. A grid framed by a `2px solid var(--rule-strong)` border with `1px solid var(--rule)` internal hairlines, cells of mono-uppercase label + value: MODE · REPO/SOURCE · DATE · GENERATOR · SOURCE HASH · COUNTS. Documents open with it; decks carry a compressed plate as the slide footer (`PLATE 04 / 18 · TALK-DECK · HTMLIFY`); pages use it as header and footer. One cell — usually MODE — gets `background: var(--signal); color: #fff` (use `#1c1a15` text on dark-mode signal if contrast demands).
2. **Hairlines over shadows.** No `box-shadow`. Structure comes from `1px var(--rule)` hairlines, `2px var(--rule-strong)` section-opening rules, and whitespace. `border-radius: 2px` maximum (stamps, code wells); everything else square. Sharp corners read "document"; rounded corners read "app".
3. **Crop marks.** Printer's registration marks in the page corners: pure CSS (`position: fixed/absolute` `::before`/`::after` elements drawing 1px lines in `--rule`, ~14px long, inset ~10px). Quiet identity on screen; literal in print.
4. **The Stamp.** Status chips as rubber stamps: `1.5px solid currentColor`, mono uppercase 11px, `padding: 2px 8px`, `border-radius: 2px`, text in the status color (`--ok`/`--warn`/`--risk`/`--signal`), transparent or wash fill. `PASS` · `RISK` · `BLOCKED` · `NEEDS VERIFICATION` · `SHIPPED`. Never pill-shaped, never filled solid.
5. **The Index.** Outlines and navigation as a drawing index: numbered `1.0 / 2.0 / 2.1`, mono, hairline-separated rows, sticky in a side rail on desktop, collapsed above the content on mobile. Numbers in `--ink-2`, labels in `--ink`.
6. **Carbon wells.** Code blocks and terminal excerpts: `--code-bg` background, a mono uppercase meta strip (language/file) separated by a hairline in a lighter ink, `border-radius: 2px`, no outer border in light mode (the dark field is its own boundary).
7. **Figure discipline.** Diagrams are inline SVG in ink + hairline + one signal accent on paper; every figure gets a mono caption with a visible source link (`FIG 3 · SOURCE: <a>…</a>`). No decorative imagery.

## Layout

- Page gutter generous; content measure ~68–74ch for prose, full-width for tables/boards.
- Sections open with a `2px var(--rule-strong)` top rule + mono section number/label, then the serif heading.
- Grids of cards become grids of **cells**: shared hairline borders (border-collapse feel), not floating cards with gaps.
- Density is a feature for operator artifacts; whitespace is a feature for decks and essays. Same tokens, different tempo.

## Decks (deckify tempo)

- Slide = a plate: paper field, serif headline (one idea), supporting figure/table, compressed plate footer with slide number + deck title + progress.
- Active nav / current chapter marked with a `--signal` underline or cell, nothing else orange.
- Speaker-notes panel and presenter chrome are carbon (dark) surfaces, so presentation chrome never competes with the paper slide.
- 40–60% of slides should be visual-led (figure, table, demo, screenshot) for content decks.

## Print

```css
@media print {
  :root { --paper: #ffffff; }
  /* crop marks render literally; keep them */
  .no-print, nav, .controls { display: none; }
  .plate { break-inside: avoid; }
  @page { margin: 14mm; }
}
```

- Stamps keep their borders (grayscale-legible).
- Carbon wells gain a `1px var(--rule)` border and may lighten to white-on-dark only if the printer dithers badly — prefer keeping the dark field.
- The plate prints as the document header; the index prints as a table of contents.

## Anti-patterns

No drop shadows · no border-radius > 2px · no gradients · no purple · no glassmorphism · no emoji as iconography · no stock or decorative imagery · no filled status pills · no more than one accent color · no fake paper texture or noise filters (warmth comes from `--paper` and the serif, not effects).
