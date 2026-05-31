# Agent Integrations

htmlify supports two integration styles:

- Invokable skill: the user asks for `$htmlify` or names the skill when they want a browser-ready artifact.
- Automatic hook: the agent's lifecycle hook detects a long final answer and writes an HTML export.

Prefer the invokable skill for production use. Hooks are useful when the user repeatedly wants long final answers archived as HTML, but hooks are agent-specific and should be installed deliberately.

## Codex

Install as a local Codex skill:

```bash
mkdir -p ~/.codex/skills
git clone https://github.com/zakelfassi/htmlify.git ~/.codex/skills/htmlify
```

Local development checkout:

```bash
ln -sfn /Users/zakelfassi/Documents/Code/htmlify ~/.codex/skills/htmlify
```

Invoke in a prompt:

```text
$htmlify turn this implementation summary into an operator brief
```

Project-level opt-in via `AGENTS.md`:

```md
For long operator handoffs, build plans, PR/release packets, incident timelines,
or status reports, use `$htmlify` and write a self-contained HTML file instead
of returning a long markdown-only answer.
```

Codex does not need a hook for the normal skill path. If you want automatic behavior, keep it as an instruction in `AGENTS.md` so the agent can choose HTML only when the answer actually benefits from it.

## Claude Code

Install as a Claude skill:

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/zakelfassi/htmlify.git ~/.claude/skills/htmlify
```

Invoke directly:

```text
Use the htmlify skill to turn this release state into a single-file HTML brief.
```

Optional automatic long-answer hook:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /Users/zakelfassi/.claude/skills/htmlify/hooks/claude-code-stop-htmlify.js",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

Put that in `~/.claude/settings.json` for all projects, `.claude/settings.json` for a committed project hook, or `.claude/settings.local.json` for a project-local uncommitted hook.

The hook reads Claude Code's `Stop` event JSON, checks `last_assistant_message`, and writes an HTML artifact only when the answer length is at least `HTMLIFY_MIN_CHARS` characters. Defaults:

```bash
export HTMLIFY_MIN_CHARS=2500
export HTMLIFY_EXPORT_ROOT="$HOME/htmlify-exports"
```

Claude Code's official hook model passes JSON to command hooks on stdin, and the `Stop` event includes `last_assistant_message`, so the hook does not parse transcript files.

## Cursor, Windsurf, Aider, And Other Agents

Use the portable skill folder when the agent supports Agent Skills:

```bash
git clone https://github.com/zakelfassi/htmlify.git ~/.agent-skills/htmlify
```

Then point the agent at `htmlify/SKILL.md` or add this project rule:

```md
When the user asks for a long report, review packet, implementation plan,
incident timeline, or decision brief, use the local htmlify skill at
~/.agent-skills/htmlify/SKILL.md and produce a self-contained HTML artifact.
```

For agents without native skills, use the CLI as a local hook target:

```bash
printf '%s' "$LONG_ANSWER_TEXT" | npx @zakelfassi/htmlify htmlify-answer --title "Agent Answer"
```

From a checked-out repo:

```bash
printf '%s' "$LONG_ANSWER_TEXT" | node /path/to/htmlify/bin/htmlify-answer.js --title "Agent Answer"
```

## Hook Safety

- Keep hooks local unless the whole team wants the behavior.
- Do not force every long answer into HTML; small terminal answers should stay in the terminal.
- Set `HTMLIFY_EXPORT_ROOT` to a predictable folder if artifacts should be archived.
- Use `HTMLIFY_MIN_CHARS` to tune threshold by team. Start with `2500`.
- Generated rich HTML is still validated by htmlify before writing when it comes through the Pi/OMP runtime.
