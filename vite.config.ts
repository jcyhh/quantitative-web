import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const supportedModes = ['development', 'staging', 'production'] as const
type SupportedMode = (typeof supportedModes)[number]

function assertSupportedMode(mode: string): asserts mode is SupportedMode {
  if (!supportedModes.includes(mode as SupportedMode)) {
    throw new Error(`Unsupported Vite mode: ${mode}. Use development, staging, or production.`)
  }
}

function assertBuildMode(command: string, mode: SupportedMode): void {
  if (command === 'build' && mode === 'development') {
    throw new Error('Development mode is only for the Vite dev server. Build staging or production instead.')
  }
}

export default defineConfig(({ command, mode }) => {
  assertSupportedMode(mode)
  assertBuildMode(command, mode)

  const environment = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = environment.API_PROXY_TARGET

  if (environment.VITE_DEPLOY_ENV !== mode) {
    throw new Error(`VITE_DEPLOY_ENV must equal the Vite mode. Received ${environment.VITE_DEPLOY_ENV ?? 'undefined'} for ${mode}.`)
  }

  return {
    plugins: [react()],
    build: {
      // Each mode owns its output. Vite only empties this directory, so a staging
      // build cannot remove a previously generated production bundle.
      outDir: `dist/${mode}`,
      emptyOutDir: true,
      assetsDir: 'assets',
      rolldownOptions: {
        output: {
          // Keep content hashes explicit instead of relying on Vite defaults.
          // Deployment may cache assets indefinitely while index.html stays fresh.
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
    server: apiProxyTarget
      ? {
          proxy: {
            '/api': {
              target: apiProxyTarget,
              changeOrigin: true,
            },
          },
        }
      : undefined,
  }
})
