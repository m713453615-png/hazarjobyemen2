const configuredBase = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '') || ''

export const apiBaseUrl = configuredBase

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let ownerToken = ''
  try {
    ownerToken = JSON.parse(localStorage.getItem('hazar-owner-api-token') || '""')
  } catch {
    ownerToken = ''
  }
  const response = await fetch(`${configuredBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(ownerToken ? { Authorization: `Bearer ${ownerToken}` } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`Hazar API request failed: ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
