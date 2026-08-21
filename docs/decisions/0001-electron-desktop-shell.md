# 0001: Electron desktop shell

## Background

The product will distribute the existing React application as a browser application and a desktop application for macOS and Windows. Mobile clients are explicitly out of scope. The renderer must remain reusable as a normal Web application while later desktop-only capabilities can safely access the operating system.

## Decision

Use Electron as a thin desktop host around the existing Vite-built React SPA.

- `src/` remains the browser-compatible FSD renderer source of truth.
- `electron/main.ts` owns `BrowserWindow`, navigation policy, IPC handlers and the local `quantlab://` renderer protocol.
- `electron/preload.cts` exposes only named bridge methods through `contextBridge`.
- Renderer Node integration remains disabled, context isolation and process sandboxing remain enabled, and new windows are denied by default.
- `electron-builder` produces unsigned local macOS DMG and Windows NSIS artifacts in ignored `release/` after the production renderer and host are built.

## Alternatives considered

- **Native desktop rewrite:** rejected because it would duplicate the React UI and business logic without a current need for native UI widgets.
- **Remote Web site in an Electron window:** rejected because it weakens the offline/reproducible package boundary and increases the security impact of remote content.
- **Enable Node.js in the React renderer:** rejected because an XSS vulnerability could become local code execution.

## Scope and trade-offs

The initial integration exposes only an app-version proof of the preload/IPC path and intentionally adds no filesystem, update, notification, background task or multi-window APIs. Electron increases artifact size and adds a release-signing requirement, in exchange for shared React code and future desktop integration points.

## Follow-up decisions

Before a backend-dependent desktop release, decide the desktop API base URL, authentication/session lifecycle and network policy. Before public distribution, provide product icons, code-signing certificates, macOS notarization credentials, Windows signing, an update strategy and platform CI runners.
