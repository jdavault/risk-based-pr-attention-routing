# @scope/pr-attention-router

Classification-only PR attention router. Code guarantees floors for sensitive files, failing
CI, and big changes; the host repository's rubric defines LOW, MEDIUM, and HIGH; the AI applies
that rubric and may raise the floor but never lower it.

This package is identical in every repository and contains no host paths.

| File | Role |
| --- | --- |
| `route.ts` | Floor, final tier, reviewer, comment, Slack text, prompt assembly, and the CLI |
| `route.test.ts` | Generic tests with an in-memory fixture |
| `classification-prompt.md` | Generic process and the four risk dimensions |
| `classification.schema.json` | Codex output: tier, summary, reasons, reviewFocus |

A host supplies `rules.json` and `rubric.md` in one directory and validates them with:

    node packages/pr-attention-router/route.ts check <adapter-dir> <repo-root>

Tested on Node 24 (TypeScript runs natively; `engines` allows 22.18+, which is untested). No
runtime dependencies.
