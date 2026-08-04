(() => {
  const MAX_WAIT_MS = 12000;

  function showRecovery(message) {
    const loading = document.querySelector('#loading');
    const dashboard = document.querySelector('#dashboard');
    const login = document.querySelector('#login-screen');
    if (!loading || loading.classList.contains('hidden')) return;

    loading.classList.add('hidden');
    const hasAuth = Object.keys(localStorage).some(key => /^sb-.*-auth-token$/.test(key));
    (hasAuth ? dashboard : login)?.classList.remove('hidden');

    const stack = document.querySelector('#error-stack');
    if (stack && hasAuth) {
      const box = document.createElement('article');
      box.className = 'error-banner';
      box.innerHTML = `<strong>Laden dauert zu lange</strong><p>${message}</p><button type="button">×</button>`;
      box.querySelector('button').onclick = () => box.remove();
      stack.prepend(box);
    }
  }

  window.addEventListener('error', event => {
    console.error('GYM boot error', event.error || event.message);
  });
  window.addEventListener('unhandledrejection', event => {
    console.error('GYM rejected promise', event.reason);
  });

  window.setTimeout(() => {
    showRecovery('Die Grundoberfläche wurde geöffnet. Daten können anschließend erneut synchronisiert werden.');
  }, MAX_WAIT_MS);
})();
