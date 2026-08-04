const CACHE='gym-shell-v50';
const CORE=[
 './index.html','./manifest.webmanifest',
 './css/app-v11.css','./css/patch-v13.css','./css/patch-v14.css','./css/training-v18.css','./css/ux-plan-v19.css','./css/progression-v20.css','./css/final-plan-v21.css',
 './css/training-mode-v30.css','./css/coach-studio-v32.css','./css/studio-page-v35.css','./css/device-photo-v36.css','./css/feature-v46.css',
 './js/app-v11.js','./js/app-fixes-v15.js','./js/training-v18.js','./js/ux-plan-v19.js','./js/progression-v20.js','./js/final-plan-v21.js','./js/sync-policy-v22.js','./js/coach-v23.js','./js/status-fix-v25.js','./js/status-fix-v26.js',
 './js/training-mode-v30.js','./js/coach-v31.js','./js/studio-page-v35.js','./js/device-photo-v36.js','./js/feature-v46.js','./js/history-coach-v48.js','./js/stability-v50.js','./js/supabase-config.js'
];

self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.allSettled(CORE.map(async url=>{
   const response=await fetch(url,{cache:'reload'});
   if(response.ok)await cache.put(url,response.clone());
  }));
  await self.skipWaiting();
 })());
});

self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});

self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const key=event.request.mode==='navigate'?'./index.html':event.request;
  const cached=await cache.match(key,{ignoreSearch:true});
  const refresh=fetch(event.request,{cache:'no-store'}).then(response=>{
   if(response.ok)cache.put(key,response.clone()).catch(()=>{});
   return response;
  }).catch(()=>null);
  if(cached){event.waitUntil(refresh);return cached}
  const fresh=await refresh;
  if(fresh)return fresh;
  return new Response('Offline-Datei nicht verfügbar',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}});
 })());
});
