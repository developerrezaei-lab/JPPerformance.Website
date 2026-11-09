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

export async function readMember(fetcher = fetch) {
  const response = await request('/me', { headers: { Accept: 'application/json' } }, fetcher);
  if (response.status === 401) return null;
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw failure(response.status);
  const member = await response.json().catch(() => null);
  if (!member || typeof member.id !== 'string' || !member.id) throw failure(response.status);
  return member;
}
export async function signOut(fetcher = fetch) {
  const token = await getCsrfToken(fetcher);
  const response = await request('/auth/logout', { method: 'POST', headers: { 'X-CSRF-TOKEN': token } }, fetcher);
  if (!response.ok && response.status !== 401) throw failure(response.status);
}
export function safeReturnPath(candidate) {
  const allowed = new Set(['/portal/', '/portal/progress', '/portal/nutrition', '/portal/exercises', '/portal/coach', '/portal/team', '/portal/admin']);
  const path = typeof candidate === 'string' ? candidate.split(/[?#]/)[0] : '';
  return allowed.has(path) ? path : '/portal/';
}
export function notifySessionChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('jp:session-changed'));
  if (window.BroadcastChannel) { const channel = new BroadcastChannel('jp-member-session'); channel.postMessage('changed'); channel.close(); }
}
export async function signUp(profile, fetcher = fetch) {
  const token = await getCsrfToken(fetcher);
  const response = await request('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token }, body: JSON.stringify({ email: profile.email, password: profile.password }) }, fetcher);
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    const message = response.status === 403 ? 'Account registration is not open yet. Please contact JP Performance.' : Object.values(problem.errors || {}).flat().join(' ') || problem.detail || 'We could not create the account. Please check your details.';
    throw new SignInError(message, response.status);
  }
  try {
    const signedInToken = await signIn(profile.email, profile.password, fetcher);
    const saved = await request('/me', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': signedInToken }, body: JSON.stringify({ displayName: profile.name, healthDataConsent: true }) }, fetcher);
    if (!saved.ok) throw failure(saved.status);
  } catch {
    const error = new SignInError('Your account was created. Please sign in or open your dashboard to finish setting up your profile.');
    error.accountCreated = true;
    throw error;
  }
}
