# Deck Template Contract

The canonical DOM shape for deckify output, and the contract the `--profile deck` validator checks. A deck that follows this template passes validation; a deck that deviates structurally should have a reason.

## Required structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Exact Talk Title</title>
  <style>/* inline only */</style>
</head>
<body>
  <header class="topbar">
    <span class="deck-title">Talk title</span>
    <span class="progress" id="progress">1 / 18</span>
    <button type="button" id="toggle-notes">Notes</button>
    <button type="button" id="toggle-guide">Guide</button>
    <button type="button" onclick="">…never inline handlers; wire in the script…</button>
  </header>

  <main class="deck-shell">
    <section class="slide active" data-title="Opening">
      <h1>One idea</h1>
      <!-- figure / table / demo panel -->
      <footer class="plate">PLATE 01 / 18 · TALK-DECK · <span class="mono">deck title</span></footer>
      <aside class="notes">Speaker notes for this slide…</aside>
    </section>
    <section class="slide" data-title="Problem">
      …
      <aside class="notes">…</aside>
    </section>
    <!-- one <section class="slide"> per slide -->
  </main>

  <aside class="notes-panel" id="notes-panel" hidden>
    <!-- current slide's notes, mirrored by the script -->
  </aside>

  <article class="guide" id="guide" hidden>
    <!-- downloadable guide / PDF companion: summaries, exercises, checklists, sources -->
  </article>

  <script>
    /* keyboard navigation, notes toggle, guide mode, print — see below */
  </script>
</body>
</html>
```

## Contract items (validator-enforced)

| Item | Requirement | Validator check |
| --- | --- | --- |
| Standalone | one `<html>`, one `<body>`, `<!DOCTYPE html>`, non-empty `<title>`, viewport meta | error if missing |
| Slides | at least 2 `<section class="slide …">`, each with `data-title` (recommended) | error if < 2 slides |
| Keyboard nav | an inline `<script>` registering a `keydown` listener (arrow keys advance/rewind; Home/End jump) | error if absent |
| Speaker notes | every substantive slide (≥ 200 chars of text or containing `h2/h3/table/figure`) contains `<aside class="notes">` | error, reported per slide |
| Script safety | inline `<script>` allowed; `<script src=…>`, inline `on*=` handler attributes, and `javascript:` URLs are banned | error |
| Self-contained | no external `src`/`srcset`/`poster`/CSS `url()`/`@import`/`<link rel>` to remote origins; no external fonts | error |
| Local assets | relative `src` references should exist on disk next to the file | warning |
| Print | `@media print` rules present (hide controls, print the guide) | warning if absent |
| Size | ≤ 2 MiB hard limit; > 512 KiB warns | error / warning |

## Keyboard navigation reference

The minimal handler the validator expects to find (shape, not exact code):

```js
const slides = Array.from(document.querySelectorAll('.slide'));
let current = Math.max(0, slides.findIndex((slide) => slide.classList.contains('active')));
function show(index) {
  current = Math.min(slides.length - 1, Math.max(0, index));
  slides.forEach((slide, i) => slide.classList.toggle('active', i === current));
  const progress = document.getElementById('progress');
  if (progress) progress.textContent = `${current + 1} / ${slides.length}`;
}
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') show(current + 1);
  if (event.key === 'ArrowLeft' || event.key === 'PageUp') show(current - 1);
  if (event.key === 'Home') show(0);
  if (event.key === 'End') show(slides.length - 1);
});
show(current);
```

Also support click/tap targets for next/previous on touch devices, and an `n`/`g` key or visible button for the notes and guide toggles when those panels exist.

## Notes and guide behavior

- `.notes` stays visually hidden in presentation mode (not `display:none` in print if the printed handout should include notes — decide per deck).
- The notes panel mirrors the active slide's `.notes` content; presenter chrome uses carbon (dark) surfaces per Hardcopy.
- Guide mode hides the deck shell and shows `article.guide` as a flowing document; `window.print()` from guide mode produces the PDF handout.
- Print CSS hides `.topbar`, navigation buttons, and the notes panel; shows the guide; `@page { margin: 14mm }`.

## Run-of-show

Include a run-of-show slide or guide section as a table: timestamp, chapter label, beat, demo/fallback. For YouTube, chapter labels should be copy-pastable into a description (`00:00 Opening`, `02:15 The problem`, …).
