const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function withLang(params = {}, language) {
  const next = { ...params };
  if (language) next.language = language;
  return next;
}

export const api = {
  health: () => request('/health'),
  dashboard: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/news/dashboard?${qs}`);
  },
  latest: (limit = 20, language) => {
    const qs = new URLSearchParams(withLang({ limit }, language)).toString();
    return request(`/news/latest?${qs}`);
  },
  important: (limit = 20, language) => {
    const qs = new URLSearchParams(withLang({ limit }, language)).toString();
    return request(`/news/important?${qs}`);
  },
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/news?${qs}`);
  },
  byCategory: (category, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/news/category/${encodeURIComponent(category)}?${qs}`);
  },
  byLocation: (location, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/news/location/${encodeURIComponent(location)}?${qs}`);
  },
  search: (q, params = {}) => {
    const cleaned = Object.fromEntries(
      Object.entries({ q, ...params }).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    const qs = new URLSearchParams(cleaned).toString();
    return request(`/news/search?${qs}`);
  },
  chat: (message, location) =>
    request('/news/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        ...(location ? { location } : {}),
      }),
    }),
  saved: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/news/saved?${qs}`);
  },
  bookmark: (id) =>
    request(`/news/${id}/bookmark`, { method: 'POST' }),
  preferences: () => request('/preferences'),
  updatePreferences: (body) =>
    request('/preferences', { method: 'PUT', body: JSON.stringify(body) }),
  notificationHistory: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/notifications/history?${qs}`);
  },
  fetchNews: () =>
    fetch('/api/proxy/fetch-news', { method: 'POST' }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      return data;
    }),
  enrichImages: () =>
    fetch('/api/proxy/enrich-images', { method: 'POST' }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image enrich failed');
      return data;
    }),
  testNotification: () =>
    fetch('/api/proxy/test-notification', { method: 'POST' }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test failed');
      return data;
    }),
};

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function labelize(value) {
  if (!value) return 'General';
  return String(value)
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
