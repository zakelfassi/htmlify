## What

<!-- One paragraph: what changes and why. Link the issue if there is one. -->

## Type

<!-- feat / fix / refactor / docs / ci / chore — matches your conventional commit -->

## Checklist

- [ ] `pnpm lint && pnpm typecheck && pnpm test` is green locally
- [ ] Conventional commit message(s), one logical change per commit
- [ ] No breaking change to the compatibility contracts (`_internals`, CLI flags/exit codes, hook path, `pi`/`omp` entry points, `skills/` paths) — or it's marked `feat!:` with a `BREAKING CHANGE:` footer and a migration note
- [ ] Validator changes come with pass **and** fail fixtures under `test/fixtures/`
- [ ] Theme or example changes were eyeballed in light mode, dark mode, and print preview
- [ ] Committed examples still pass `node bin/htmlify-answer.js --validate`
