---
name: quant-lab-cross-cutting-change
description: Change a Quant Lab public contract or shared project foundation with an explicit impact map and synchronized documentation. Use for routes, i18n, storage, theme, environment, dependencies, CI, shared capabilities, or Electron bridge changes.
---

# Quant Lab cross-cutting change

Use this skill when a change affects more than its immediate implementation module. The goal is one coherent public contract, not a local patch that leaves configuration, documentation or validation out of sync.

## Map the contract first

1. Read `AGENTS.md`, `docs/ai-collaboration.md` and the current public entry points for the affected capability.
2. List the source of truth, consumers, public import/configuration entry, documentation and verification command before editing.
3. If the change crosses browser, Electron renderer, device or runtime boundaries, read `docs/compatibility.md` and every relevant registered contract before choosing an API or changing a fallback.
4. Record a decision in `docs/decisions/` when the change establishes a long-lived cross-module direction. Do not create an ADR for a reversible internal detail.
5. If the public change includes React renderer state, Effects, shared Hooks, lists, charts, client loading or code-splitting boundaries, read `quant-lab-react-engineering` before designing the contract.
6. When investigation reveals a confirmed, non-obvious problem that will influence future changes, route it through `docs/ai-skills.md#从问题到团队知识` and include its enforcement or verification evidence in the impact map.

## Required impact checks

Apply only the rows relevant to the requested change:

| Change | Also inspect or update |
| --- | --- |
| Route | route configuration, router, page slice, navigation, both locale files and route documentation |
| Shared capability | named capability directory, root `index.ts`, focused test and `docs/ai-collaboration.md` infrastructure table |
| Language key | `zh-CN`, `en-US`, locale-key test and the owning module copy |
| Storage key | `sharedConfig.storageKeys`, `StorageSchema`, storage behavior and documentation |
| Theme/token | theme registration, token completeness, both locale labels and existing-page verification |
| Environment/build | environment templates, type/config validation, environment documentation, CI and deployment assumptions |
| Dependency | reuse decision, `package.json`, `pnpm-lock.yaml`, build-script allowlist review, purpose/risk documentation and CI |
| Electron bridge | `electron/preload.cts`, validated main-process IPC handler, renderer abstraction only when consumed, `electron/README.md` and desktop build |
| Compatibility contract | `docs/compatibility.md`, affected capability boundary, observable fallback/cleanup test and any required manual device/runtime verification |
| Reusable problem knowledge | the correct lint/test, module documentation, compatibility contract, ADR or `docs/todo.md`; do not retain unproven claims as a project rule |
| Public module boundary | owning module README with responsibility, entry, constraints, extension points and verification |

## Safety boundaries

- Do not hard-code secrets, product hosts, credentials or pending backend rules to make a change appear complete.
- Do not approve package build scripts, publish packages, push commits or alter remote settings without the user’s explicit authorization.
- Do not weaken a lint rule, CI check or type setting to complete a migration. Update the contract and implementation instead.

## Verify and hand off

Run the relevant focused tests plus `pnpm run lint` and `pnpm run build`; include `pnpm run desktop:build` for Electron changes. Report the impact map, documentation changed, validation results and every remaining product-owned decision. When compatibility applies, list the contracts read, the preserved/replaced behavior and all pending manual verification.
