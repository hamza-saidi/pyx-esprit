import axios from 'axios';

const instance = axios.create({
  baseURL: import.meta?.env?.VITE_API_BASE_URL || '/api',
  withCredentials: true, // needed so the xsrf-token cookie is sent back
});

// ── CSRF helpers ────────────────────────────────────────────────────────────

function getCsrfCookie() {
  const match = document.cookie.match(/(?:^|; )xsrf-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

let csrfFetchPromise = null;

async function ensureCsrfToken() {
  let token = getCsrfCookie();
  if (token) return token;

  // Only one fetch at a time even if multiple requests race
  if (!csrfFetchPromise) {
    csrfFetchPromise = axios
      .get(`${instance.defaults.baseURL}/csrf-token`, { withCredentials: true })
      .then((res) => {
        csrfFetchPromise = null;
        return res.data?.csrfToken;
      })
      .catch((err) => {
        csrfFetchPromise = null;
        throw err;
      });
  }

  return csrfFetchPromise;
}

// ── Request interceptor ─────────────────────────────────────────────────────

instance.interceptors.request.use(async (config) => {
  // Auth header
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // CSRF header — required on any state-changing method
  const safeMethods = new Set(['get', 'head', 'options']);
  if (!safeMethods.has((config.method || 'get').toLowerCase())) {
    try {
      const csrfToken = await ensureCsrfToken();
      if (csrfToken) {
        config.headers['x-xsrf-token'] = csrfToken;
      }
    } catch {
      // Let the request go through — server will return 403 and the user
      // will see an error, which is better than silently hanging.
    }
  }

  return config;
});

// ── Response interceptor ────────────────────────────────────────────────────

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch {}
      if (typeof window !== 'undefined' && window.location?.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
