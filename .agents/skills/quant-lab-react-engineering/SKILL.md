---
name: quant-lab-react-engineering
description: Design, implement or review Quant Lab React rendering code with deliberate state, effect, list, async and bundle performance choices. Use for TSX, Hooks, client loading, charts, lists or component refactors; not for pure styles, copy or non-renderer configuration.
---

# Quant Lab React rendering and performance

Use this skill together with the task's delivery, cross-cutting or review skill when React renderer behavior is in scope. Its purpose is to make performance-relevant choices explicit before they become a production incident, without adding optimization ceremony to static UI.

## Assess the rendering path first

Before changing code, identify only the factors that apply:

- which interaction, request or external subscription updates this component;
- whether the rendered data can be large, frequently refreshed, or displayed in a dense chart or list;
- whether derived values duplicate source state or can be computed during rendering;
- whether independent client work is accidentally serialized; and
- whether a rarely used, genuinely heavy dependency belongs behind a route or component boundary.

Read the owning module's public entry, nearby components, Hooks, tests and README. Preserve FSD ownership: move state no higher than its real consumers, and only expose a shared capability through its root `index.ts`.

## Prefer stable data flow

- Keep derived data in render logic. Do not add an Effect merely to synchronize values that already follow from props or state.
- Use Effects only to synchronize with an external system. Put user-initiated work in the event handler and always clean up subscriptions, timers and in-flight work that can outlive the component.
- Keep state close to the consumer. Split a component or context when unrelated changes would otherwise redraw a broad subtree; do not add global state or Context pre-emptively.
- Use stable domain identifiers for mutable lists. Never use a changing list index as a key.
- Do not define a component inside another component when it needs stable identity or local state.
- Start independent client requests deliberately in parallel when their contracts allow it. Keep actual request ownership in the project's API and FSD boundaries rather than introducing a new fetching or cache library by default.

## Apply optimization only where it buys something

- Treat `memo`, `useMemo` and `useCallback` as tools for an identified rerender, expensive calculation or required referential identity. They are not default component scaffolding.
- For high-frequency input, live data or charts, isolate the changing subtree first. Use deferred or transition-based rendering only when it preserves the intended interaction and the actual work cannot be reduced structurally.
- For large collections, establish the expected size and interaction before choosing pagination, incremental rendering or virtualization. Do not add a virtual-list dependency to an ordinary small list.
- Use `React.lazy` and dynamic import only for a measured or clearly heavy, infrequently reached boundary. Do not preconfigure Vite manual chunks merely for theoretical bundle optimization.

## Project boundaries

- This is a Vite client renderer, not a Next.js or React Server Components application. Do not introduce server-component, server-action or framework-specific caching patterns.
- Preserve the repository's FSD public-entry rule even when generic advice discourages barrel files.
- Keep the current SCSS, i18n, strict TypeScript, arithmetic, time, compatibility and accessibility-scope rules intact. This skill does not authorize a new dependency, global state library, lint exception or style system.
- If a browser, device, Electron renderer or runtime API is involved, also follow `docs/compatibility.md` and its matching contract before changing fallbacks or cleanup.

## Verify and hand off

Test the observable state transition, parsing or defect behavior when the change makes it testable. During review, inspect dependency arrays, cleanup, state placement, list keys, async dependency chains and unusually broad rerender paths. Run the task's normal validation commands.

State in the handoff which rendering risks were assessed and either the optimization made or the concrete reason it was unnecessary. Record a confirmed, reusable performance or runtime lesson through `docs/ai-skills.md#从问题到团队知识`; do not elevate an unmeasured hunch into a project-wide rule.
