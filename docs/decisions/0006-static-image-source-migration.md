# 0006: Explicit static image source migration

## Background

The application will eventually contain large, stable visual assets. Re-encoding them after Vite has emitted hashed files would invalidate the relationship between asset content and cache filenames. Re-encoding in a build plugin would keep source and development behavior different, repeat work on every build, and make the resulting format harder to review.

## Decision

Use the explicit `pnpm run assets:optimize` command to migrate qualifying PNG source assets to WebP before normal Vite processing. The command is developer-invoked only: `build`, desktop build and CI do not run it or modify the Git worktree.

The script scans only managed `src/**/assets/**/*.png` resources. It requires a file size of at least 512 KiB, a single PNG frame, a smaller WebP result, and supported static source references. It changes only those resolved references, writes the WebP beside the original, verifies no supported PNG reference remains, then removes the PNG. Its transaction rolls back changed references and generated WebP files if a migration cannot complete.

## Consequences

The committed source resource becomes WebP, so Vite continues to own final hashes and URLs. Developers must review image sharpness, transparent edges and Git diff before committing. The repository must not rely on these published assets as the sole design master; original design files belong in the design system or a deliberate non-release archive.

GIF, SVG, APNG, existing WebP, `public/` files, dynamic URLs, unreferenced files and small PNGs are intentionally outside this automation. `sharp` remains a development-only dependency used by the explicit script and is not shipped in renderer or Electron packages.
