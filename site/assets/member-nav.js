import { readMember, signOut, notifySessionChange } from './auth-client.js?v=20261109.4';
let state = { loading: true, user: null, error: false }, version = 0, pending = null, checkedAt = 0;
const listeners = new Set();
export function subscribeMember(listener) { listeners.add(listener); listener(state); return () => listeners.delete(listener); }
function publish(next) { state = next; render(); listeners.forEach(listener => listener(state)); }
function render() {
  const member = state.user;
  document.querySelectorAll('[data-guest-link]').forEach(element => { element.hidden = !!member; });
  const account = document.querySelector('[data-member-account]');
  if (account) {
    account.hidden = !member;
    const name = member?.displayName || member?.email || 'My account';
    account.querySelector('[data-member-name]').textContent = name;
    account.querySelector('summary').title = name;
    account.querySelector('summary').setAttribute('aria-label', 'My account: ' + name);
    account.querySelector('[data-member-initials]').textContent = name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase();
    if (!member) account.open = false;
  }
  document.querySelectorAll('[data-member-footer]').forEach(link => { link.href = member ? '/portal/' : '/login/'; link.textContent = member ? 'My dashboard' : 'Member sign in'; });
}
export function refreshMember(force = false) {
  if (pending && !force) return pending;
  // پاسخ قدیمیِ نشست نباید وضعیت ورود یا خروج جدید را روی منو بازنویسی کند.
  const ownVersion = ++version;
  pending = (async () => {
    try { const user = await readMember(); if (ownVersion === version) publish({ loading: false, user, error: false }); }
    catch { if (ownVersion === version) publish({ ...state, loading: false, error: true }); }
    finally { if (ownVersion === version) { pending = null; checkedAt = Date.now(); } }
  })();
  return pending;
}
export async function logoutMember() {
  const buttons = [...document.querySelectorAll('[data-member-signout]')];
  buttons.forEach(button => { button.disabled = true; });
  const status = document.querySelector('[data-member-status]');
  if (status) status.textContent = '';
  try { await signOut(); ++version; publish({ loading: false, user: null, error: false }); notifySessionChange(); }
  catch (error) { if (status) status.textContent = error.message; }
  finally { buttons.forEach(button => { button.disabled = false; }); }
}
document.querySelectorAll('[data-member-signout]').forEach(button => button.addEventListener('click', logoutMember));
window.addEventListener('jp:session-changed', () => refreshMember(true));
window.addEventListener('pageshow', event => { if (event.persisted) refreshMember(true); });
window.addEventListener('focus', () => { if (Date.now() - checkedAt > 1500) refreshMember(true); });
if (window.BroadcastChannel) { const channel = new BroadcastChannel('jp-member-session'); channel.addEventListener('message', () => refreshMember(true)); }
refreshMember();
