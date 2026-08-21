# 0005: Curated React rendering and performance skill

## Background

The repository begins with little product code, so React performance choices need to be guided before component patterns become widespread. A generic external skill can offer useful production experience, but adopting it verbatim would introduce advice for frameworks and dependencies this Vite and FSD project does not use.

## Decision

Add the repository-owned `quant-lab-react-engineering` skill. Delivery, cross-cutting and review skills route to it only when a task changes React renderer behavior: TSX runtime logic, Hooks, state, Effects, lists, charts, client loading, code-splitting or component structure.

The skill was curated from Vercel Labs' MIT-licensed `react-best-practices` in `vercel-labs/agent-skills`. It preserves the applicable decision checks: state and Effect placement, rerender isolation, stable list identity, independent async work, cleanup, and justified lazy loading. It does not copy an external workflow or install an external package.

## Consequences

React work receives proactive rendering-path review, while static styling, copy and repository configuration do not pay an irrelevant reading cost. `memo`, caching, virtualization, global state and bundle splitting remain evidence-driven implementation decisions rather than mandatory scaffolding.

The project does not adopt Next.js or React Server Components guidance, server actions or caches, third-party client-cache dependencies, Tailwind/shadcn conventions, or advice that bypasses FSD root public entries. Future additions require a real product requirement and their own compatible project decision.

The upstream source is a reference, not a synchronized dependency: <https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices>. Review it when real project experience reveals a gap; update this project skill only after reconciling the change with local rules and validating it in a normal change.
