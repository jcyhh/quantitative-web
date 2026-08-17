/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_DESCRIPTION?: string
  readonly VITE_ROBOTS?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_TIMEOUT?: string
  readonly VITE_DEPLOY_ENV?: 'development' | 'staging' | 'production'
  readonly VITE_DEFAULT_LANGUAGE?: 'zh-CN' | 'en-US'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
