# Electron desktop shell

This directory is the desktop host, not a Feature-Sliced Design renderer slice. React pages, domain logic and browser-compatible shared capabilities remain in `src/`; this host loads the production renderer bundle and exposes the smallest possible desktop bridge.

## Entry points

- `main.ts`: creates secure native windows, serves the renderer with the `quantlab://` protocol and owns IPC handlers.
- `preload.cts`: exposes individually named, typed-in-the-renderer desktop APIs. It must never expose `ipcRenderer`, Node.js modules or generic message channels.

## Extending desktop capabilities

1. Confirm that the capability truly requires the desktop host rather than an existing browser/shared API.
2. Add one narrowly named method in `preload.cts`; do not expose a generic IPC sender/listener.
3. Register its matching `ipcMain` handler in `main.ts`, validate the sender and validate all renderer-provided input.
4. Add the renderer-side type and a browser-safe shared abstraction only when a React module consumes it.
5. Add focused tests where the implementation is deterministic, then run `pnpm run lint`, `pnpm run test`, `pnpm run desktop:build` and `pnpm run desktop:dev`.

## Current bridge

`window.quantLabDesktop.getAppVersion()` is the intentionally small proof of the preload and IPC boundary. No React module consumes it yet.

## Boundaries and open decisions

- Renderer Node integration stays disabled; context isolation and process sandboxing stay enabled.
- New browser windows are denied by default. Multi-window work must be a separate feature with an explicit route, lifecycle and state-sharing design.
- The production renderer uses the local `quantlab://` protocol rather than `file://`.
- Current production API configuration defaults to `/api`, which relies on a Web deployment gateway. Before shipping an Electron build that calls backend APIs, define the desktop API origin and authentication/session policy; do not hard-code a host here.
- Release signing, macOS notarization, Windows code signing, updater transport and product icons are not configured. They need product-owned credentials and a dedicated release task.
