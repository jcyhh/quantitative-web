---
name: quant-lab-feature-delivery
description: Implement or modify a Quant Lab frontend business capability while preserving FSD boundaries, documented contracts, and required verification. Use for feature work and bug fixes; do not use for review-only or cross-cutting infrastructure changes.
---

# Quant Lab feature delivery

Use this skill to deliver one scoped user-facing capability. It coordinates existing project rules; `AGENTS.md`, the linked project documents, lint and CI remain authoritative.

## Before changing code

1. Read `AGENTS.md`, then the task-relevant module entry points, types, tests and README files. Read the detailed project documents named by `AGENTS.md` when the task touches their area.
2. Inspect the worktree. Preserve unrelated changes and state the smallest expected file/module boundary before editing.
3. Classify the work: user action belongs in `features`, stable domain data in `entities`, route composition in `pages`, reusable composite UI in `widgets`, and domain-neutral infrastructure in `shared`.
4. Search for an existing public capability before creating one. Import other slices only through their root `index.ts`.
5. Classify compatibility impact. If the task touches browser, Electron renderer, device or runtime-dependent behavior, read `docs/compatibility.md` and every relevant registered contract before designing the implementation. Do not load compatibility documents for unrelated work.
6. If the task changes TSX runtime logic, Hooks, state, Effects, lists, charts, client-side loading, code-splitting boundaries or component structure, read `quant-lab-react-engineering` before implementation. Do not load it for pure copy, static SCSS or non-renderer configuration.
7. During investigation and after a fix, decide whether a discovered problem is reusable team knowledge: it must be confirmed, non-obvious and likely to change a future implementation choice. Route it through `docs/ai-skills.md#从问题到团队知识`; do not preserve ordinary debugging history as a rule.

## Make decisions deliberately

- Ask a focused question instead of inventing API shape, permissions, financial formulas, units, rounding, time zones or trading behavior.
- Switch to `quant-lab-cross-cutting-change` when the task changes a route, public entry point, language key, storage key, theme, environment contract, dependency, CI rule or Electron bridge.
- Keep the change scoped. Do not use a feature request to rename, migrate or refactor unrelated modules.
- Preserve registered fallbacks, cleanup and timeout behavior. Do not replace them merely because a newer browser API or shorter implementation looks preferable; a replacement needs documented evidence and regression coverage.

## Implement and verify

- Follow the repository type, style, i18n and shared-capability rules. Do not duplicate their mechanically enforced details in this skill.
- Create or update the owning module README when the task creates or changes a public module boundary; use `docs/architecture.md#模块说明` for the required scope and contents.
- Add nearby tests when changing a formula, parser, state transition, shared capability or defect behavior. Static page composition does not require a mechanical page test.
- When a compatibility contract applies, update its evidence in the same task and test observable fallback behavior where the current runner can do so. Record exact manual device/runtime verification when automation cannot represent it.
- Check the relevant loading, empty, failure and normal states; state explicitly if a requirement is deferred.
- Run `pnpm run test` when tests are affected, then `pnpm run lint` and `pnpm run build`. Run `pnpm run desktop:build` when the task touches `electron/` or desktop build configuration.

## Handoff

Report the changed modules, validation actually run, deliberate assumptions and unresolved product decisions. State `Compatibility impact: none` or list the contracts read, rules preserved or changed, and remaining manual verification. For any newly confirmed reusable problem, state its routing destination and enforcement evidence. Do not claim deployment, API integration, commit or push unless it was performed.
