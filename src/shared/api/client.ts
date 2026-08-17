export type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue | QueryValue[]>

export interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: BodyInit | Record<string, unknown>
  headers?: HeadersInit
  params?: QueryParams
  timeout?: number
}

export class HttpError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(status: number, message: string, payload: unknown = null) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.payload = payload
  }
}

type AccessTokenResolver = () => string | null | undefined

export class ApiClient {
  private accessTokenResolver: AccessTokenResolver | undefined
  private readonly baseUrl: string

  constructor(baseUrl = sharedConfig.api.baseUrl) {
    this.baseUrl = baseUrl
  }

  setAccessTokenResolver(resolver?: AccessTokenResolver): void { this.accessTokenResolver = resolver }
  get<T>(path: string, options?: Omit<RequestOptions, 'body'>): Promise<T> { return this.request<T>(path, options) }
  post<T>(path: string, body?: RequestOptions['body'], options?: Omit<RequestOptions, 'body'>): Promise<T> { return this.request<T>(path, this.withBody('POST', body, options)) }
  put<T>(path: string, body?: RequestOptions['body'], options?: Omit<RequestOptions, 'body'>): Promise<T> { return this.request<T>(path, this.withBody('PUT', body, options)) }
  patch<T>(path: string, body?: RequestOptions['body'], options?: Omit<RequestOptions, 'body'>): Promise<T> { return this.request<T>(path, this.withBody('PATCH', body, options)) }
  delete<T>(path: string, options?: Omit<RequestOptions, 'body'>): Promise<T> { return this.request<T>(path, { ...options, method: 'DELETE' }) }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { body, headers, params, timeout = sharedConfig.api.timeout, signal, ...init } = options
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeout)
    const onAbort = (): void => { controller.abort(signal?.reason) }
    signal?.addEventListener('abort', onAbort, { once: true })

    try {
      const requestHeaders = new Headers(headers)
      requestHeaders.set('Accept', 'application/json')
      const token = this.accessTokenResolver?.()
      if (token) requestHeaders.set('Authorization', `Bearer ${token}`)
      const preparedBody = this.prepareBody(body, requestHeaders)
      const response = await fetch(this.buildUrl(path, params), {
        ...init,
        ...(preparedBody === undefined ? {} : { body: preparedBody }),
        headers: requestHeaders,
        signal: controller.signal,
      })
      const payload = await parseResponse(response)
      if (!response.ok) throw new HttpError(response.status, response.statusText || 'Request failed', payload)
      return payload as T
    } finally {
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
  }

  private buildUrl(path: string, params?: QueryParams): string {
    const isAbsoluteUrl = path.startsWith('http://') || path.startsWith('https://')
    const baseUrl = new URL(`${this.baseUrl.replace(/\/$/, '')}/`, window.location.origin)
    const url = isAbsoluteUrl ? new URL(path) : new URL(path.replace(/^\//, ''), baseUrl)
    Object.entries(params ?? {}).forEach(([key, value]) => {
      const values = Array.isArray(value) ? value : [value]
      values.filter((item): item is Exclude<QueryValue, null | undefined> => item !== null && item !== undefined).forEach((item) => url.searchParams.append(key, String(item)))
    })
    return url.toString()
  }

  private withBody(method: 'POST' | 'PUT' | 'PATCH', body: RequestOptions['body'] | undefined, options?: Omit<RequestOptions, 'body'>): RequestOptions {
    return body === undefined ? { ...options, method } : { ...options, method, body }
  }

  private prepareBody(body: RequestOptions['body'], headers: Headers): BodyInit | undefined {
    if (body === undefined) return undefined
    if (isPlainObject(body)) {
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
      return JSON.stringify(body)
    }
    return body
  }
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  return (response.headers.get('content-type') ?? '').includes('application/json') ? response.json() : response.text()
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Blob) && !(value instanceof FormData) && !(value instanceof URLSearchParams)
}

export const apiClient = new ApiClient()
import { sharedConfig } from '../config'
