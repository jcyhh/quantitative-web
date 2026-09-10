import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [react()],
    test: {
        name: 'component',
        environment: 'jsdom',
        include: ['src/**/*.test.tsx'],
        setupFiles: ['./vitest.setup.ts'],
        restoreMocks: true,
        unstubEnvs: true,
        unstubGlobals: true,
        coverage: {
            provider: 'v8',
            include: ['src/**/*.tsx'],
            exclude: ['src/**/*.test.tsx'],
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: 'coverage/component',
        },
    },
})
