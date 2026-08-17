import { sharedConfig } from '../../config'
import type { AppTheme } from '../../config/theme'

type StorageSchema = {
  [sharedConfig.storageKeys.language]: string
  [sharedConfig.storageKeys.theme]: AppTheme
  [sharedConfig.storageKeys.pwaInstalled]: boolean
  [sharedConfig.storageKeys.accessToken]: string
}

export type AppStorageKey = keyof StorageSchema

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function get<K extends AppStorageKey>(key: K): StorageSchema[K] | null {
  if (!isBrowser()) return null

  const rawValue = window.localStorage.getItem(key)
  if (rawValue === null) return null

  try {
    return JSON.parse(rawValue) as StorageSchema[K]
  } catch {
    // Supports values written by earlier versions before JSON serialization.
    return rawValue as StorageSchema[K]
  }
}

function set<K extends AppStorageKey>(key: K, value: StorageSchema[K]): void {
  if (!isBrowser()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function remove(key: AppStorageKey): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(key)
}

function clearAppStorage(): void {
  if (!isBrowser()) return
  Object.values(sharedConfig.storageKeys).forEach((key) => window.localStorage.removeItem(key))
}

export const storage = { get, set, remove, clearAppStorage }
