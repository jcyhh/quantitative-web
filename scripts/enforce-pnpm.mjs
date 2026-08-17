import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const userAgent = process.env.npm_config_user_agent ?? ''
const forbiddenLockfiles = ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'bun.lock', 'bun.lockb']
const foundLockfiles = forbiddenLockfiles.filter((fileName) => existsSync(resolve(process.cwd(), fileName)))

if (!userAgent.startsWith('pnpm/')) {
  console.error('This project only supports pnpm. Run project commands with pnpm or pnpm run.')
  process.exitCode = 1
}

if (foundLockfiles.length > 0) {
  console.error(`Remove unsupported lockfile(s): ${foundLockfiles.join(', ')}. This project only commits pnpm-lock.yaml.`)
  process.exitCode = 1
}
