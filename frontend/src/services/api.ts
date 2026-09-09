const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pt_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    register: (body: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request<any>('/auth/me'),
    logout: () => request<any>('/auth/logout', { method: 'POST' }),
  },

  // Platforms
  platforms: {
    list: () => request<any>('/platforms'),
    getById: (id: number | string) => request<any>(`/platforms/${id}`),
  },

  // Products
  products: {
    list: (params?: { search?: string; category?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<any>(`/products${q ? `?${q}` : ''}`);
    },
    getById: (id: number | string) => request<any>(`/products/${id}`),
    create: (body: { urls: Array<{ url: string; platformId?: number } | string>; title?: string; brand?: string; category?: string }) =>
      request<any>('/products', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number | string, body: any) => request<any>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: number | string) => request<any>(`/products/${id}`, { method: 'DELETE' }),

    // Links
    addLink: (productId: number | string, body: { url: string; platformId?: number }) =>
      request<any>(`/products/${productId}/links`, { method: 'POST', body: JSON.stringify(body) }),
    deleteLink: (productId: number | string, linkId: number | string) =>
      request<any>(`/products/${productId}/links/${linkId}`, { method: 'DELETE' }),
    refreshLink: (productId: number | string, linkId: number | string) =>
      request<any>(`/products/${productId}/links/${linkId}/refresh`, { method: 'POST' }),

    // History & Comparison
    getPrices: (id: number | string) => request<any>(`/products/${id}/prices`),
    getHistory: (id: number | string) => request<any>(`/products/${id}/prices/history`),
    getComparison: (id: number | string) => request<any>(`/products/${id}/comparison`),
  },

  // Alerts
  alerts: {
    list: () => request<any>('/alerts'),
    getById: (id: number | string) => request<any>(`/alerts/${id}`),
    create: (body: { productLinkId: number; alertType: string; targetPrice?: number }) =>
      request<any>('/alerts', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number | string, body: { isActive?: boolean; targetPrice?: number }) =>
      request<any>(`/alerts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: number | string) => request<any>(`/alerts/${id}`, { method: 'DELETE' }),
  },

  // Admin
  admin: {
    getStatistics: () => request<any>('/admin/scrape-statistics'),
    getUsers: () => request<any>('/admin/users'),
    getProducts: () => request<any>('/admin/products'),
    getPlatforms: () => request<any>('/admin/platforms'),
    createPlatform: (body: any) => request<any>('/platforms', { method: 'POST', body: JSON.stringify(body) }),
    updatePlatform: (id: number | string, body: any) => request<any>(`/platforms/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deletePlatform: (id: number | string) => request<any>(`/platforms/${id}`, { method: 'DELETE' }),
    getScrapeLogs: (params?: { status?: string; platformId?: string; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<any>(`/admin/scrape-logs${q ? `?${q}` : ''}`);
    },
    getFailedProducts: () => request<any>('/admin/failed-products'),
  },
};
