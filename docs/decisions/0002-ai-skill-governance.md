# 0002: Versioned AI skill governance

## Background

The repository is maintained by multiple people using different AI coding tools. Personal prompts and global skill installations drift over time, while many architecture decisions require context that static lint cannot infer.

## Decision

Keep canonical, reviewable team skills in `.agents/skills/`. Use `AGENTS.md` for concise mandatory rules, `docs/` and ADRs for detailed durable knowledge, skills for task workflow, and lint/tests/CI for mechanically enforceable policy.

Start with feature delivery, cross-cutting change and read-only change review skills. Require a single writer for any overlapping worktree scope; use a separate read-only review agent after an implementation diff exists.

## Consequences

Skills are versioned with the code and validated as part of `pnpm run lint`, but individual AI tools may need their own local loading configuration. Tool-specific adapters remain thin pointers to the repository source and do not duplicate rules.

New rules are promoted only after real use demonstrates a repeatable need. Deterministic violations belong in executable checks rather than prose skills.
