// Shared sign-in flow for the public website and the Vue portal. Cookies remain HttpOnly.
export class SignInError extends Error {
  constructor(message, status = 0) { super(message); this.name = 'SignInError'; this.status = status; }
}
function failure(status) {
  return new SignInError(status === 401 ? 'Email or password is incorrect.' : status === 429 ? 'Too many attempts. Please wait a minute before trying again.' : 'The sign-in service is unavailable. Please try again shortly.', status);
}
async function request(path, options, fetcher) {
  try { return await fetcher('/api/v1' + path, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(12000), ...options }); }
  catch { throw failure(0); }
}
export async function getCsrfToken(fetcher = fetch) {
  const response = await request('/auth/csrf', { headers: { Accept: 'application/json' } }, fetcher);
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw failure(response.status);
  const data = await response.json().catch(() => null);
  if (!data || typeof data.token !== 'string' || !data.token) throw failure(response.status);
  return data.token;
}
export async function signIn(email, password, fetcher = fetch) {
  const token = await getCsrfToken(fetcher);
  const response = await request('/auth/login?useCookies=true', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token }, body: JSON.stringify({ email, password }) }, fetcher);
  if (!response.ok) throw failure(response.status);
  return getCsrfToken(fetcher); // Anti-forgery identity changes after authentication.
}
