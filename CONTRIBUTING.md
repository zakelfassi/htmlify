# Contributing to htmlify

Thanks for your interest in improving htmlify and deckify. This guide covers the workflow, conventions, and quality bar for contributions.

## Quick start

```bash
git clone https://github.com/zakelfassi/htmlify.git
cd htmlify
corepack enable        # provisions the pinned pnpm version
pnpm install
pnpm test
```

Requirements: Node.js 20 or newer, pnpm (managed via Corepack — never npm or yarn).

## Development workflow

| Command | What it does |
| --- | --- |
| `pnpm test` | Runs the full test suite (`node --test`) |
| `pnpm lint` | Checks formatting and lint rules (Biome) |
| `pnpm lint:fix` | Applies safe formatting/lint fixes |
| `pnpm typecheck` | Type-checks the JSDoc annotations (`tsc --noEmit`) |

All three checks run in CI and must pass before merge.

### Project shape

- `src/` — the runtime, plain CommonJS with JSDoc types. Zero runtime dependencies is a hard constraint: what ships is what you read.
- `index.js` — thin façade exposing the Pi/OMP extension factory and `_internals`. Do not add logic here.
- `bin/htmlify-answer.js` — the CLI (export + `--validate`).
- `hooks/` — agent lifecycle hooks (Claude Code Stop hook). Paths here are a public contract; do not move or rename them.
- `skills/htmlify/`, `skills/deckify/` — the agent skills (SKILL.md + references). These are product surface, not docs: changes to operating rules or validation steps are behavior changes.
- `examples/` — committed gallery artifacts. Every file must pass `node bin/htmlify-answer.js --validate` with its profile; CI enforces this.

### Compatibility contracts

Treat these as semver-relevant public API:

- `package.json` `main`, `bin`, `pi.extensions`, `omp.extensions`
- every name exported on `index.js` `_internals`
- CLI flags and exit codes of `htmlify-answer`
- the hook script path `hooks/claude-code-stop-htmlify.js` and its env vars (`HTMLIFY_MIN_CHARS`, `HTMLIFY_EXPORT_ROOT`, `HTMLIFY_SKIP_OPEN`)
- skill directory paths `skills/htmlify` and `skills/deckify`

## Commit conventions

This repo uses [Conventional Commits](https://www.conventionalcommits.org/); [release-please](https://github.com/googleapis/release-please) turns them into versions and the CHANGELOG.

- `feat:` new capability (minor bump)
- `fix:` bug fix (patch bump)
- `feat!:` / `BREAKING CHANGE:` footer — breaking change (major bump)
- `docs:`, `chore:`, `refactor:`, `test:`, `ci:` — no release impact

Keep commits to one logical change. No `Co-Authored-By` or tool-attribution trailers.

## Pull requests

1. Branch from `main`.
2. Make sure `pnpm lint && pnpm typecheck && pnpm test` is green locally.
3. If you touched validation logic, add fixtures under `test/fixtures/` covering both the pass and fail paths.
4. If you changed an example artifact or the document theme, open the artifact in a browser and check light mode, dark mode (`prefers-color-scheme`), and print preview.
5. Fill in the PR template — especially the compatibility-contract checklist.

Small, focused PRs review faster than large ones. For anything architectural, open an issue first to discuss.

## Reporting bugs and requesting features

Use the [issue forms](https://github.com/zakelfassi/htmlify/issues/new/choose). For security issues, **do not open a public issue** — see [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the [Apache License 2.0](LICENSE).
