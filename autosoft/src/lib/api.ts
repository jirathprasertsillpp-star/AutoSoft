// ─── Autosoft API Client ────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

if (process.env.NODE_ENV === 'production' && BASE_URL.includes('localhost')) {
  console.warn('⚠️ NEXT_PUBLIC_API_URL is not set. API calls will default to localhost and likely fail in production.')
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('autosoft_token')
}

async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export const api = {
  // ── Health ────────────────────────────────────────────────────
  health: () => request('/health'),

  // ── Auth ──────────────────────────────────────────────────────
  signin: (email: string, password: string) =>
    request<{ token: string; user: any }>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (email: string, password: string, name: string, companyName: string) =>
    request<{ success: boolean; message: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, companyName }),
    }),

  getMe: () => request<{ user: any }>('/api/auth/me'),

  // ── Employees ────────────────────────────────────────────────
  getEmployees: () => request<{ data: any[] }>('/api/employees'),
  createEmployee: (data: any) =>
    request<{ data: any }>('/api/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: any) =>
    request<{ data: any }>(`/api/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEmployee: (id: string) =>
    request<{ success: boolean }>(`/api/employees/${id}`, { method: 'DELETE' }),
  reviewEmployee: (id: string) =>
    request<{ data: any }>(`/api/employees/${id}/review`, { method: 'POST' }),

  // ── Transactions ─────────────────────────────────────────────
  getTransactions: () => request<{ data: any[] }>('/api/transactions'),
  createTransaction: (data: any) =>
    request<{ data: any }>('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransactionStatus: (id: string, status: string) =>
    request<{ data: any }>(`/api/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  deleteTransaction: (id: string) =>
    request<{ success: boolean }>(`/api/transactions/${id}`, { method: 'DELETE' }),

  // ── Deals ────────────────────────────────────────────────────
  getDeals: () => request<{ data: any[] }>('/api/deals'),
  createDeal: (data: any) =>
    request<{ data: any }>('/api/deals', { method: 'POST', body: JSON.stringify(data) }),
  updateDeal: (id: string, data: any) =>
    request<{ data: any }>(`/api/deals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteDeal: (id: string) =>
    request<{ success: boolean }>(`/api/deals/${id}`, { method: 'DELETE' }),
  analyzeLead: (id: string) =>
    request<{ data: any }>(`/api/deals/${id}/analyze`, { method: 'POST' }),

  // ── Meetings ─────────────────────────────────────────────────
  getMeetings: () => request<{ data: any[] }>('/api/meetings'),
  analyzeMeeting: (data: any) =>
    request<{ data: any }>('/api/meetings/analyze', { method: 'POST', body: JSON.stringify(data) }),
  toggleMeetingAction: (id: string) =>
    request<{ success: boolean }>(`/api/meetings/action/${id}`, { method: 'PATCH' }),
  updateMeeting: (id: string, data: any) =>
    request<{ success: boolean }>(`/api/meetings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // ── Chat ─────────────────────────────────────────────────────
  sendMessage: (message: string, sessionId = 'default') =>
    request<{ text: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    }),
  getChatHistory: (sessionId = 'default') =>
    request<{ data: any[] }>(`/api/chat/history?sessionId=${sessionId}`),

  // ── Documents ────────────────────────────────────────────────
  getDocuments: () => request<{ data: any[] }>('/api/documents'),
  analyzeDocument: (data: any) =>
    request<{ data: any }>('/api/documents/analyze', { method: 'POST', body: JSON.stringify(data) }),
  deleteDocument: (id: string) =>
    request<{ success: boolean }>(`/api/documents/${id}`, { method: 'DELETE' }),
  updateDocumentRisks: (id: string, risks: any[]) =>
    request<{ data: any }>(`/api/documents/${id}/risks`, {
      method: 'PATCH',
      body: JSON.stringify({ risks }),
    }),

  // ── Campaigns ────────────────────────────────────────────────
  getCampaigns: () => request<{ data: any[] }>('/api/campaigns'),
  createCampaign: (data: any) =>
    request<{ data: any }>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  updateCampaign: (id: string, data: any) =>
    request<{ data: any }>(`/api/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteCampaign: (id: string) =>
    request<{ success: boolean }>(`/api/campaigns/${id}`, { method: 'DELETE' }),
  analyzeCampaign: (id: string) =>
    request<{ data: any }>(`/api/campaigns/${id}/analyze`, { method: 'POST' }),

  // ── AI Stats ─────────────────────────────────────────────────
  getAIStats: () => request<{ data: any }>('/api/ai-stats'),
}
