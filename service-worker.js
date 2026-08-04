const CACHE = 'gym-shell-v38';
const CORE = [
  './',
  './index.html',
  './css/app-v11.css',
  './js/app-v11.js',
  './js/supabase-config.js',
  './manifest.webmanifest'
];

const CSS_MODULES = [
  'patch-v13.css','patch-v14.css','training-v18.css','ux-plan-v19.css',
  'progression-v20.css','final-plan-v21.css','training-mode-v30.css',
  'coach-studio-v32.css','regression-fix-v34.css','studio-page-v35.css',
  'device-photo-v36.css'
];
const JS_MODULES = [
  'boot-rescue-v38.js','auth-clock-guard-v33.js','app-fixes-v15.js',
  'training-v18.js','ux-plan-v19.js','progression-v20.js','final-plan-v21.js',
  'sync-policy-v22.js','coach-v23.js','status-fix-v25.js','status-fix-v26.js',
  'training-mode-v30.js','coach-v31.js','studio-v32.js','regression-fix-v34.js',
  'studio-page-v35.js','device-photo-v36.js'
];

async function enhanceHtml(response) {
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;
  let html = await response.text();

  for (const css of CSS_MODULES) {
    if (!html.includes(`css/${css}`)) {
      html = html.replace('</head>', `<link rel="stylesheet" href="css/${css}?v=38"></head>`);
    }
  }
  for (const js of JS_MODULES) {
    if (!html.includes(`js/${js}`)) {
      const classic = js === 'boot-rescue-v38.js' || js === 'auth-clock-guard-v33.js';
      html = html.replace('</body>', `<script ${classic ? '' : 'type="module" '}src="js/${js}?v=38"></script></body>`);
    }
  }

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: { ...Object.fromEntries(response.headers.entries()), 'content-type': 'text/html; charset=utf-8' }
  });
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(CORE.map(asset => cache.add(asset)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const own = url.origin === self.location.origin;
  const navigation = event.request.mode === 'navigate';

  if (navigation) {
    event.respondWith((async () => {
      try {
        const network = await fetch(event.request, { cache: 'no-store' });
        const enhanced = await enhanceHtml(network);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', enhanced.clone()).catch(() => {});
        return enhanced;
      } catch {
        const cached = await caches.match('./index.html');
        if (cached) return enhanceHtml(cached);
        return new Response('<h1>GYM konnte nicht geladen werden</h1><p>Bitte erneut versuchen.</p>', { headers: { 'content-type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  if (own) {
    event.respondWith((async () => {
      try {
        const network = await fetch(event.request);
        if (network.ok) {
          const cache = await caches.open(CACHE);
          cache.put(event.request, network.clone()).catch(() => {});
        }
        return network;
      } catch {
        return (await caches.match(event.request)) || Response.error();
      }
    })());
  }
});
