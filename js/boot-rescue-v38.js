(() => {
  const FALLBACK_DELAY = 8000;
  const APP_URL = './js/app-v11.js?v=40';
  const SUPABASE_UMD = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
  const SUPABASE_URL = 'https://spmyrocxftgisdeiuiyg.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_090vD-HjxF19zoKWc9LLMQ_Xz6JliJs';

  function loadingVisible() {
    const loading = document.querySelector('#loading');
    return loading && !loading.classList.contains('hidden');
  }

  function showFailure(error) {
    const loading = document.querySelector('#loading');
    if (!loading) return;
    loading.classList.remove('hidden');
    loading.style.display = 'grid';
    loading.innerHTML = `
      <div style="max-width:340px;padding:24px;text-align:center">
        <strong style="display:block;font-size:20px;margin-bottom:10px">App konnte nicht starten</strong>
        <p style="line-height:1.45;margin:0 0 16px">${String(error?.message || error || 'Unbekannter Startfehler')}</p>
        <button type="button" id="boot-retry" style="min-height:48px;padding:0 20px;border:0;border-radius:14px;font:inherit;font-weight:700">Neu laden</button>
      </div>`;
    document.querySelector('#boot-retry')?.addEventListener('click', () => location.reload());
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(script => script.src === src || script.src.startsWith(src));
      if (existing && window.supabase?.createClient) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Supabase-Bibliothek konnte nicht geladen werden.'));
      document.head.appendChild(script);
    });
  }

  async function startFallback() {
    if (window.__gymFallbackStarted || !loadingVisible()) return;
    window.__gymFallbackStarted = true;

    try {
      await loadScript(SUPABASE_UMD);
      if (!window.supabase?.createClient) throw new Error('Supabase wurde geladen, ist aber nicht verfügbar.');

      const response = await fetch(APP_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Basis-App konnte nicht geladen werden (${response.status}).`);
      let source = await response.text();

      source = source
        .replace(/^import\s*\{createClient\}\s*from\s*['"][^'"]+['"];?/, '')
        .replace(/import\s*\{SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY\}\s*from\s*['"]\.\/supabase-config\.js['"];?/, '');

      const run = new Function(
        'createClient',
        'SUPABASE_URL',
        'SUPABASE_PUBLISHABLE_KEY',
        `${source}\n//# sourceURL=app-v11-fallback.js`
      );
      run(window.supabase.createClient, SUPABASE_URL, SUPABASE_KEY);

      window.setTimeout(() => {
        if (loadingVisible()) showFailure('Die Basis-App wurde gestartet, hat den Ladevorgang aber nicht abgeschlossen.');
      }, 12000);
    } catch (error) {
      console.error('GYM fallback boot failed', error);
      showFailure(error);
    }
  }

  window.addEventListener('error', event => {
    console.error('GYM boot error', event.error || event.message);
  });
  window.addEventListener('unhandledrejection', event => {
    console.error('GYM rejected promise', event.reason);
  });

  window.setTimeout(startFallback, FALLBACK_DELAY);
})();
