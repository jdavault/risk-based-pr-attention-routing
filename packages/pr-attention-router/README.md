# PR Attention Router

Small, application-independent classification engine for pull requests.

The host supplies `config/pr-attention-router/rules.json` for deterministic
path floors and `rubric.md` for repository-specific LOW, MEDIUM, and HIGH
definitions. Code also sets a MEDIUM floor when required validation fails or a
change reaches 250 lines. AI may raise the floor but cannot lower it.

The workflow runs four native Node 22.18+ subcommands:

```text
route.ts evidence <paths-z-file> <numstat-file> <verify-conclusion> <base-sha> <head-sha>
route.ts prompt <adapter-dir> <evidence.json> <pull-request.json>
route.ts route <adapter-dir> <evidence.json> <ai-output-file> <pull-request.json> [previous-tier]
route.ts check <adapter-dir> <repo-root>
```

The package has no runtime dependencies and no host application knowledge.
