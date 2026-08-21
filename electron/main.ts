import { app, BrowserWindow, ipcMain, net, protocol } from 'electron'
import { existsSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const appProtocol = 'quantlab'
const developmentRendererUrl = process.env.DESKTOP_RENDERER_URL
const electronDirectory = dirname(fileURLToPath(import.meta.url))
const preloadPath = join(electronDirectory, 'preload.cjs')
let mainWindow: BrowserWindow | null = null

protocol.registerSchemesAsPrivileged([
  {
    scheme: appProtocol,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
])

function rendererDirectory(): string {
  return join(app.getAppPath(), 'dist', 'production')
}

function resolveRendererFile(requestUrl: string): string {
  const requestedPath = decodeURIComponent(new URL(requestUrl).pathname)
  const requestedFile = requestedPath === '/' ? 'index.html' : requestedPath.slice(1)
  const candidate = resolve(rendererDirectory(), requestedFile)
  const relativePath = relative(rendererDirectory(), candidate)
  const isInsideRendererDirectory = relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))

  if (isInsideRendererDirectory && existsSync(candidate)) return candidate

  return join(rendererDirectory(), 'index.html')
}

async function registerRendererProtocol(): Promise<void> {
  await protocol.handle(appProtocol, async (request): Promise<Response> => {
    const response = await net.fetch(pathToFileURL(resolveRendererFile(request.url)).toString())
    const headers = new Headers(response.headers)

    headers.set(
      'Content-Security-Policy',
      "default-src 'self'; base-uri 'none'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https:",
    )

    return new Response(response.body, { headers, status: response.status, statusText: response.statusText })
  })
}

function rendererUrl(): string {
  return developmentRendererUrl ?? `${appProtocol}://app/index.html`
}

function isTrustedRenderer(url: string): boolean {
  if (developmentRendererUrl !== undefined) return new URL(url).origin === new URL(developmentRendererUrl).origin

  return new URL(url).protocol === `${appProtocol}:`
}

async function createMainWindow(): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: preloadPath,
    },
  })

  window.once('ready-to-show', (): void => window.show())
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event, url): void => {
    if (!isTrustedRenderer(url)) event.preventDefault()
  })
  window.on('closed', (): void => {
    mainWindow = null
  })

  await window.loadURL(rendererUrl())
  return window
}

function registerIpcHandlers(): void {
  ipcMain.handle('desktop:get-app-version', (event): string => {
    const senderFrame = event.senderFrame

    if (senderFrame === null || !isTrustedRenderer(senderFrame.url)) {
      throw new Error('Rejected an IPC request from an untrusted renderer.')
    }

    return app.getVersion()
  })
}

app.whenReady().then(async (): Promise<void> => {
  await registerRendererProtocol()
  registerIpcHandlers()
  mainWindow = await createMainWindow()

  app.on('activate', async (): Promise<void> => {
    if (mainWindow === null) mainWindow = await createMainWindow()
  })
})

app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') app.quit()
})
