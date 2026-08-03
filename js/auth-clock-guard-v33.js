(() => {
  const MESSAGE_KEY = 'gym-auth-clock-message';
  const AUTH_KEY_PATTERN = /^sb-.*-auth-token$/;

  function decodeJwtPayload(token) {
    try {
      const part = token.split('.')[1];
      if (!part) return null;
      const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      return JSON.parse(decodeURIComponent(Array.from(atob(padded), c =>
        `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`
      ).join('')));
    } catch {
      return null;
    }
  }

  function extractAccessToken(raw) {
    try {
      const parsed = JSON.parse(raw);
      return parsed?.access_token || parsed?.currentSession?.access_token || null;
    } catch {
      return null;
    }
  }

  const now = Math.floor(Date.now() / 1000);
  let removed = false;

  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (!key || !AUTH_KEY_PATTERN.test(key)) continue;
    const token = extractAccessToken(localStorage.getItem(key));
    const payload = token ? decodeJwtPayload(token) : null;
    if (payload?.iat && payload.iat > now + 60) {
      localStorage.removeItem(key);
      removed = true;
    }
  }

  if (removed) {
    sessionStorage.setItem(
      MESSAGE_KEY,
      'Die gespeicherte Anmeldung hatte einen ungültigen Zeitstempel und wurde zurückgesetzt. Bitte prüfe unter Einstellungen → Allgemein → Datum & Uhrzeit, ob „Automatisch einstellen“ aktiv ist, und melde dich erneut an.'
    );
  }

  window.addEventListener('DOMContentLoaded', () => {
    const message = sessionStorage.getItem(MESSAGE_KEY);
    if (!message) return;
    sessionStorage.removeItem(MESSAGE_KEY);
    const loginError = document.querySelector('#login-error');
    if (loginError) loginError.textContent = message;
  });
})();
