import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const electronCli = resolve('node_modules/electron/cli.js')
let electronProcess
let rendererUrl

const viteProcess = spawn(pnpmCommand, ['run', 'dev', '--', '--host', '127.0.0.1'], {
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
})

function startElectron(url) {
  if (electronProcess !== undefined) return

  electronProcess = spawn(process.execPath, [electronCli], {
    env: { ...process.env, DESKTOP_RENDERER_URL: url },
    stdio: 'inherit',
  })

  electronProcess.on('exit', (code) => {
    viteProcess.kill()
    process.exitCode = code ?? 0
  })
}

function forwardViteOutput(chunk, target) {
  const output = chunk.toString()
  target.write(output)

  if (rendererUrl !== undefined) return

  const match = output.match(/http:\/\/127\.0\.0\.1:\d+\//)

  if (match === null) return

  rendererUrl = match[0]
  startElectron(rendererUrl)
}

viteProcess.stdout.on('data', (chunk) => forwardViteOutput(chunk, process.stdout))
viteProcess.stderr.on('data', (chunk) => forwardViteOutput(chunk, process.stderr))
viteProcess.on('exit', (code) => {
  if (electronProcess === undefined) process.exitCode = code ?? 1
})

function stopProcesses() {
  viteProcess.kill()
  electronProcess?.kill()
}

process.on('SIGINT', stopProcesses)
process.on('SIGTERM', stopProcesses)
