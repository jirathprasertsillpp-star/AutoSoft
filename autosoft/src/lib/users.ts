import { api } from './api'

// ─── Token helpers ─────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('autosoft_token')
}

export function setToken(token: string) {
  localStorage.setItem('autosoft_token', token)
}

export function clearToken() {
  localStorage.removeItem('autosoft_token')
  localStorage.removeItem('autosoft_user')
}

// ─── User cache (avoid repeated API calls) ────────────────────
export function getCachedUser(): any {
  if (typeof window === 'undefined') return null
  const u = localStorage.getItem('autosoft_user')
  return u ? JSON.parse(u) : null
}

export function setCachedUser(user: any) {
  localStorage.setItem('autosoft_user', JSON.stringify(user))
}

// ─── Auth actions ─────────────────────────────────────────────
export async function login(email: string, password: string) {
  try {
    const res = await api.signin(email, password)
    setToken(res.token)
    setCachedUser(res.user)
    return { success: true, user: res.user }
  } catch (e: any) {
    return { success: false, error: e.message || 'เข้าสู่ระบบไม่ได้' }
  }
}

export async function register(
  email: string,
  password: string,
  name: string,
  companyName: string,
) {
  try {
    const res = await api.signup(email, password, name, companyName)
    return { success: true, message: res.message }
  } catch (e: any) {
    return { success: false, error: e.message || 'สมัครสมาชิกไม่ได้' }
  }
}

export function logout() {
  clearToken()
}

export function getUser(): any {
  return getCachedUser()
}

export function hasAccess(user: any, roleRequired?: string): boolean {
  if (!user) return false
  if (user.role?.toLowerCase() === 'admin') return true
  if (!roleRequired) return true
  return user.role?.toLowerCase() === roleRequired.toLowerCase()
}

// ─── Refresh user from API ────────────────────────────────────
export async function refreshUser(): Promise<any> {
  try {
    const res = await api.getMe()
    setCachedUser(res.user)
    return res.user
  } catch {
    clearToken()
    return null
  }
}
