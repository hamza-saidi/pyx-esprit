const DEFAULT_PORT = process.env.PORT || 5000;

function normalizeBaseUrl(raw, { defaultProtocol } = {}) {
  if (!raw || typeof raw !== 'string') return '';
  let v = raw.trim().replace(/\/+$/, '');
  if (!v) return '';
  // Allow users to set just "example.com" (common in hosting panels)
  if (!/^https?:\/\//i.test(v)) {
    const proto = defaultProtocol || 'https';
    v = `${proto}://${v}`;
  }
  return v.replace(/\/+$/, '');
}

/**
 * Returns the publicly accessible base URL for backend-generated links.
 * You can optionally pass the current Express request to fall back to
 * its host header in development (useful when the env var is not set).
 */
function getPublicBaseUrl(req) {
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();

  // Prefer explicit backend/public URL env vars
  const explicitRaw =
    process.env.PUBLIC_BASE_URL ||
    process.env.BACKEND_URL ||
    process.env.API_BASE_URL ||
    process.env.BASE_URL;

  // As a practical fallback: if only FRONTEND_URL is configured in prod (common),
  // we can still generate public links (assuming same domain / reverse proxy).
  const frontendRaw = process.env.FRONTEND_URL;

  // If we have a request, try to infer protocol + host (works behind proxies if headers are set)
  let inferred = '';
  if (req && typeof req.get === 'function') {
    const host = req.get('host');
    const xfProto = req.get('x-forwarded-proto');
    const protocol =
      (xfProto ? String(xfProto).split(',')[0].trim() : req.protocol || 'http') || 'http';
    if (host) inferred = normalizeBaseUrl(`${protocol}://${host}`, { defaultProtocol: protocol });
  }

  const explicit = normalizeBaseUrl(explicitRaw, {
    defaultProtocol: inferred.startsWith('http://') ? 'http' : 'https',
  });
  const frontend = normalizeBaseUrl(frontendRaw, {
    defaultProtocol: inferred.startsWith('http://') ? 'http' : 'https',
  });

  const isLocal = (v) =>
    v && /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(v.replace(/\/+$/, ''));

  // In production, never emit localhost URLs (this causes broken links for recipients)
  if (explicit && !isLocal(explicit)) return explicit;
  if (frontend && !isLocal(frontend)) return frontend;
  if (inferred && !isLocal(inferred)) return inferred;

  if (nodeEnv === 'production') {
    throw new Error(
      'PUBLIC_BASE_URL is not configured for production. Set PUBLIC_BASE_URL (or BACKEND_URL) to your public domain to generate tracking links.'
    );
  }

  // Development fallback
  if (explicit) return explicit;
  return `http://localhost:${DEFAULT_PORT}`;
}

module.exports = { getPublicBaseUrl };
