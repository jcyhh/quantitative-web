---
name: quant-lab-change-review
description: Perform a read-only Quant Lab change review for FSD boundaries, public contracts, tests, documentation, and risky assumptions. Use after an implementation diff exists; do not use to implement a feature or replace lint and CI.
---

# Quant Lab change review

Review an existing diff as an independent, read-only agent. The purpose is to find issues that static checks cannot reliably infer; lint, tests and CI remain mandatory even when this review finds nothing.

## Review procedure

1. Read `AGENTS.md`, the diff, and only the task-relevant modules, contracts and tests.
2. Confirm the requested scope before treating a difference as a defect. Do not expand a review into an unsolicited redesign.
3. Check FSD direction, public `index.ts` boundaries, ownership of resources and shared-capability promotion decisions.
4. Check API/domain changes for runtime validation, stated units/precision/time-zone behavior, loading/empty/failure states and unproven business assumptions.
5. Check whether public entries, routes, i18n, storage, theme, environment, Electron or CI changes have their required documentation and verification updates, including the owning module README for a public module boundary. For browser, device or runtime-sensitive changes, check `docs/compatibility.md`, applicable contracts, preserved fallbacks/cleanup, and evidence for automated versus manual verification.
6. Read test changes for observable behavior and boundary cases rather than implementation-detail assertions.
7. When a diff fixes or works around a non-obvious problem, check that any confirmed reusable knowledge is routed to the appropriate executable rule or documentation rather than remaining only in code comments or task discussion.

## Findings

- Report only evidence-backed findings caused by the diff.
- State file and line, user/developer impact, a concise rationale and a proportionate priority.
- Separate confirmed issues from questions or follow-up suggestions.
- If there are no findings, say so and list the checks performed. Do not claim that commands passed unless their output was provided or you ran them.

## Write boundary

Do not edit files, stage changes, commit, push, or perform external actions. Return findings to the implementing agent or user for an explicit follow-up task.
