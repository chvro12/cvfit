export interface CurrentUser {
  id: string
  email: string
  name: string | null
  role: 'USER' | 'ADMIN'
  plan: 'FREE' | 'PRO'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data && typeof data.error === 'string'
      ? data.error
      : `Le serveur ne répond pas (HTTP ${response.status}). Vérifiez qu'il est démarré, puis réessayez.`
    throw new Error(message)
  }
  return (data ?? {}) as T
}

export async function login(email: string, password: string) {
  return request<{ user: CurrentUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function register(name: string, email: string, password: string) {
  return request<{ user: CurrentUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export async function logout() {
  return request<{ ok: true }>('/api/auth/logout', { method: 'POST' })
}

export async function getMe() {
  return request<{ user: CurrentUser }>('/api/auth/me')
}

export async function getAdminStats() {
  return request<{ stats: { totalUsers: number; totalCVs: number; totalOptimizations: number; activeToday: number } }>('/api/admin/stats')
}

export async function getAdminUsers() {
  return request<{ users: Array<{ email: string; name: string | null; role: string; createdAt: string; _count: { documents: number; generations: number } }> }>('/api/admin/users')
}
