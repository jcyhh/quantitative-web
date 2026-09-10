import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { apiClient } from './shared/api'
import { sharedConfig } from './shared/config'
import './shared/i18n'
import './app/styles/index.scss'
import { initializeTheme } from './shared/theme'
import { initializePwaInstallLifecycle } from './shared/lib/pwa'
import { storage } from './shared/lib/storage'

apiClient.setAccessTokenResolver(() => storage.get(sharedConfig.storageKeys.accessToken))
initializeTheme()
initializePwaInstallLifecycle()

const rootElement = document.getElementById('root')

if (rootElement === null) throw new Error('Application root element was not found.')

createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
