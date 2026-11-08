import { signIn } from './auth-client.js?v=20261109.2';
const form = document.querySelector('#member-login');
const fields = document.querySelector('#login-fields');
const status = document.querySelector('#login-status');
const button = document.querySelector('#login-submit');
let busy = false;
fields.disabled = false; // Enable the form once its handler is installed; do not pre-disable on API availability.
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  busy = true; fields.disabled = true; button.textContent = 'Signing in…'; status.textContent = '';
  const email = document.querySelector('#login-email').value.trim();
  const password = document.querySelector('#login-password').value;
  try {
    await signIn(email, password);
    document.querySelector('#login-password').value = '';
    location.assign('/portal/');
  } catch (error) {
    status.textContent = error.message;
    document.querySelector('#login-password').value = '';
  } finally { busy = false; fields.disabled = false; button.textContent = 'Sign in →'; }
});
