/** 极简 fetch 封装：自动带 token、统一错误。 */

const TOKEN_KEY = 'eio.token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* noop */
  }
}

export class HttpError extends Error {
  status: number
  data: unknown
  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

async function request<T>(
  method: Method,
  url: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : null) || `Request failed: ${res.status}`
    throw new HttpError(msg, res.status, data)
  }
  return data as T
}

export const http = {
  get:    <T>(url: string)                   => request<T>('GET',    url),
  post:   <T>(url: string, body?: unknown)   => request<T>('POST',   url, body),
  put:    <T>(url: string, body?: unknown)   => request<T>('PUT',    url, body),
  patch:  <T>(url: string, body?: unknown)   => request<T>('PATCH',  url, body),
  delete: <T>(url: string)                   => request<T>('DELETE', url),
}
