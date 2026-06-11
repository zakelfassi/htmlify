# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 1.x | Yes |
| < 1.0 | No — upgrade to 1.x |

## Reporting a vulnerability

Please report vulnerabilities privately via [GitHub Security Advisories](https://github.com/zakelfassi/htmlify/security/advisories/new) (preferred) or by email to zakelfassi@gmail.com. Do not open a public issue for security reports.

You can expect an acknowledgment within 72 hours and a fix or mitigation plan within 14 days for confirmed issues. Credit is given in the release notes unless you prefer otherwise.

## Threat model and built-in safeguards

htmlify writes HTML files to disk and opens them in your browser, so the main risks are script injection through generated artifacts and untrusted content reaching a rendered page. The runtime defends against this by design:

- **Validation before write.** Rich/model-generated HTML is rejected unless it is a standalone document, and the validator blocks `<script>` (in the `rich` profile), inline event handlers (`on*=`), `javascript:` URLs, `<iframe>`/`<object>`/`<embed>`, meta refresh, external asset references (including SVG `href`), and remote CSS `url()` — artifacts must be fully self-contained.
- **Interactive profiles stay constrained.** The `app` and `deck` validation profiles allow inline `<script>` for navigation/interactivity but still reject external scripts (`<script src=`), event-handler attributes, and `javascript:` URLs.
- **The annotation layer is the only trusted script** injected by the local renderer; it is static, embedded in the package source, and uses `localStorage` only.
- **No network access.** The runtime has zero dependencies and makes no network calls; exports are local files. Optional rich rendering shells out only to tools you explicitly configure (Pi model, Gemini CLI).
- **Hooks are opt-in and bounded.** The Claude Code Stop hook only reads the transcript JSON passed to it, applies a size threshold, and writes under the export root (`HTMLIFY_EXPORT_ROOT`, default tmpdir).

If you find a way to smuggle active content past the validator, that is exactly the class of bug we want reported.
