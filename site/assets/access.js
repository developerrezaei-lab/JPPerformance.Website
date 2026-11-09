import { signIn, signUp, safeReturnPath, notifySessionChange } from './auth-client.js?v=20261109.4';
import { subscribeMember, refreshMember } from './member-nav.js?v=20261109.4';
const form = document.querySelector('#member-auth');
const fields = document.querySelector('#account-fields');
const status = document.querySelector('#account-status');
const button = document.querySelector('#account-submit');
const registration = form.dataset.mode === 'register';
let busy = false;
subscribeMember(state => {
  document.querySelector('[data-account-form]').hidden = !!state.user;
  document.querySelector('[data-signed-in]').hidden = !state.user;
  document.querySelector('[data-signed-name]').textContent = state.user?.displayName || state.user?.email || '';
});
if (new URLSearchParams(location.search).get('created') === '1') {
  const notice = document.querySelector('[data-account-notice]');
  notice.textContent = 'Your account was created. Sign in to continue setting up your profile.'; notice.hidden = false;
}
document.querySelector('[data-password-toggle]').addEventListener('click', event => {
  const input = document.querySelector('#member-password');
  const show = input.type === 'password'; input.type = show ? 'text' : 'password';
  event.currentTarget.textContent = show ? 'Hide' : 'Show'; event.currentTarget.setAttribute('aria-pressed', String(show));
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const email = document.querySelector('#member-email').value.trim();
  const password = document.querySelector('#member-password').value;
  const name = registration ? document.querySelector('#member-name').value.trim() : '';
  if (registration && !form.elements.consent.checked) return;
  busy = true; fields.disabled = true; button.textContent = registration ? 'Creating account…' : 'Signing in…'; status.textContent = '';
  try {
    if (registration) await signUp({ email, password, name }); else await signIn(email, password);
    notifySessionChange();
    location.assign(safeReturnPath(new URLSearchParams(location.search).get('next')));
  } catch (error) {
    if (error.accountCreated) { notifySessionChange(); location.assign('/login/?created=1'); return; }
    status.textContent = error.message;
    refreshMember(true);
  } finally { document.querySelector('#member-password').value = ''; busy = false; fields.disabled = false; button.textContent = registration ? 'Create account →' : 'Sign in →'; }
});
fields.disabled = false;
