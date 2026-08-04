const CACHE='gym-shell-v46';
const ASSETS=[
 './','./index.html','./manifest.webmanifest',
 './css/app-v11.css','./css/patch-v13.css','./css/patch-v14.css','./css/training-v18.css','./css/ux-plan-v19.css','./css/progression-v20.css','./css/final-plan-v21.css',
 './css/training-mode-v30.css','./css/coach-studio-v32.css','./css/studio-page-v35.css','./css/device-photo-v36.css','./css/stable-ui-v46.css',
 './js/app-v11.js','./js/app-fixes-v15.js','./js/training-v18.js','./js/ux-plan-v19.js','./js/progression-v20.js','./js/final-plan-v21.js','./js/sync-policy-v22.js','./js/coach-v23.js','./js/status-fix-v25.js','./js/status-fix-v26.js','./js/bootstrap-v46.js',
 './js/training-mode-v30.js','./js/coach-v31.js','./js/studio-page-v35.js','./js/device-photo-v36.js','./js/stable-ui-v46.js','./js/supabase-config.js',
 './IMG_3040.png','./IMG_3041.png','./IMG_3042.png','./IMG_3043.png','./IMG_3044.png','./IMG_3045.png','./IMG_3046.png','./IMG_3047.png','./IMG_3048.png','./IMG_3049.png','./IMG_3050.png','./IMG_3051.png','./IMG_3062.png','./IMG_3063.png','./IMG_3064.png','./IMG_3065.png','./IMG_3066.png','./IMG_3067.png','./IMG_3068.png','./IMG_3069.png','./IMG_3070.png','./IMG_3071.png'
];

async function prepareHtml(response){
 const type=response.headers.get('content-type')||'';
 if(!type.includes('text/html'))return response;
 let html=await response.text();
 html=html.replace(/<script type="module" src="js\/bootstrap-v46\.js(?:\?v=46)?"><\/script>/g,'');
 html=html.replace('</body>','<script type="module" src="js/bootstrap-v46.js?v=46"></script></body>');
 return new Response(html,{status:response.status,statusText:response.statusText,headers:{...Object.fromEntries(response.headers.entries()),'content-type':'text/html; charset=utf-8'}});
}

self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.allSettled(ASSETS.map(url=>cache.add(new Request(url,{cache:'reload'}))));
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
   try{
    const fresh=await fetch(event.request,{cache:'no-store'});
    const prepared=await prepareHtml(fresh);
    const cache=await caches.open(CACHE);
    cache.put('./index.html',prepared.clone()).catch(()=>{});
    return prepared;
   }catch(error){
    const cached=await caches.match('./index.html');
    if(cached)return prepareHtml(cached);
    throw error;
   }
  })());
  return;
 }
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const fresh=await fetch(event.request,{cache:'no-store'});
   if(fresh.ok)cache.put(event.request,fresh.clone()).catch(()=>{});
   return fresh;
  }catch(error){
   const cached=await cache.match(event.request,{ignoreSearch:true});
   if(cached)return cached;
   throw error;
  }
 })());
});
