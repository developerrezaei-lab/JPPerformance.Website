'use strict';
(() => {
  const buttons = [...document.querySelectorAll('[data-portal]')];
  const title = document.querySelector('#access-title');
  const status = document.querySelector('#access-message');
  const retry = document.querySelector('#access-retry');
  let checking = false;
  async function check() {
    if (checking) return;
    checking = true; retry.hidden = true;
    buttons.forEach(button => { button.disabled = true; });
    title.textContent = 'Checking member access…';
    status.textContent = 'Please wait while we check that the studio is available.';
    try {
      const response = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Unavailable');
      const data = await response.json();
      if (typeof data.token !== 'string' || !data.token) throw new Error('Unavailable');
      buttons.forEach(button => { button.disabled = false; });
      title.textContent = 'Your studio is ready.';
      status.textContent = 'Choose your workspace above. You will sign in securely on the next page.';
    } catch {
      title.textContent = 'Member access is not available right now.';
      status.textContent = 'Please try again shortly. You can still use our free fitness tools and exercise library without signing in.';
      retry.hidden = false;
    } finally { checking = false; }
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    if (!button.disabled && ['/portal/', '/portal/coach', '/portal/admin'].includes(button.dataset.portal)) location.assign(button.dataset.portal);
  }));
  retry.addEventListener('click', check);
  check();
})();
