const CACHE='gym-shell-v48';
const CORE=[
 './index.html','./manifest.webmanifest',
 './css/app-v11.css','./css/patch-v13.css','./css/patch-v14.css','./css/training-v18.css','./css/ux-plan-v19.css','./css/progression-v20.css','./css/final-plan-v21.css',
 './css/training-mode-v30.css','./css/coach-studio-v32.css','./css/studio-page-v35.css','./css/device-photo-v36.css','./css/feature-v46.css',
 './js/app-v11.js','./js/app-fixes-v15.js','./js/training-v18.js','./js/ux-plan-v19.js','./js/progression-v20.js','./js/final-plan-v21.js','./js/sync-policy-v22.js','./js/coach-v23.js','./js/status-fix-v25.js','./js/status-fix-v26.js','./js/bootstrap-v46.js',
 './js/training-mode-v30.js','./js/coach-v31.js','./js/studio-page-v35.js','./js/device-photo-v36.js','./js/feature-v46.js','./js/history-coach-v48.js','./js/supabase-config.js'
];

async function prepareHtml(response){
 const type=response.headers.get('content-type')||'';
 if(!type.includes('text/html'))return response;
 let html=await response.text();
 html=html.replace(/<script type="module" src="js\/bootstrap-v46\.js(?:\?v=\d+)?"><\/script>/g,'');
 html=html.replace('</body>','<script type="module" src="js/bootstrap-v46.js?v=48"></script></body>');
 return new Response(html,{status:response.status,statusText:response.statusText,headers:{...Object.fromEntries(response.headers.entries()),'content-type':'text/html; charset=utf-8'}});
}

self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.allSettled(CORE.map(async url=>{
   const response=await fetch(url,{cache:'reload'});
   if(!response.ok)throw new Error(url);
   if(url.endsWith('index.html'))await cache.put('./index.html',(await prepareHtml(response)).clone());
   else await cache.put(url,response);
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
 if(event.request.mode==='navigate'){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   const cached=await cache.match('./index.html');
   event.waitUntil(fetch('./index.html',{cache:'no-store'}).then(async fresh=>{if(fresh.ok)await cache.put('./index.html',(await prepareHtml(fresh)).clone())}).catch(()=>{}));
   if(cached)return cached;
   const fresh=await fetch(event.request,{cache:'no-store'});
   const prepared=await prepareHtml(fresh);
   await cache.put('./index.html',prepared.clone());
   return prepared;
  })());
  return;
 }
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(event.request,{ignoreSearch:true});
  if(cached){event.waitUntil(fetch(event.request,{cache:'no-store'}).then(r=>{if(r.ok)return cache.put(event.request,r.clone())}).catch(()=>{}));return cached}
  const fresh=await fetch(event.request,{cache:'no-store'});
  if(fresh.ok)cache.put(event.request,fresh.clone()).catch(()=>{});
  return fresh;
 })());
});
