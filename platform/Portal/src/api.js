import { reactive } from 'vue';
export const session = reactive({ user: null, busy: false });
let csrf = '';
export class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
export async function refreshCsrf() {
  const response = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin' });
  if (!response.ok) throw new ApiError('Could not establish a secure session. Please try again.', response.status);
  csrf = (await response.json()).token;
}
export async function api(path, options = {}) {
  if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const method = options.method || 'GET';
  if (method !== 'GET' && !csrf) await refreshCsrf();
  const response = await fetch('/api/v1' + path, { ...options, credentials: 'same-origin', headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { 'X-CSRF-TOKEN': csrf } : {}), ...options.headers } });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = response.status === 401 ? 'Please sign in again.' : response.status === 429 ? 'Too many requests. Please wait a minute.' : data.detail || Object.values(data.errors || {}).flat().join(' ') || data.title || 'The request could not be completed.';
    if (response.status === 401 && path !== '/auth/login?useCookies=true') session.user = null;
    throw new ApiError(message, response.status);
  }
  return response.status === 204 || response.headers.get('content-length') === '0' ? null : response.json().catch(() => null);
}
export function send(path, body, method = 'POST') { return api(path, { method, body: JSON.stringify(body) }); }
export async function loadSession() { try { session.user = await api('/me'); } catch (e) { if (e.status !== 401) throw e; } }
export const isCoach = () => session.user?.roles.includes('Coach');
export const isAdmin = () => session.user?.roles.includes('Admin');
