const CACHE='gym-shell-v14';
const ASSETS=['./','./index.html','./css/app-v11.css','./css/patch-v13.css','./css/patch-v14.css','./js/app-v11.js','./js/calendar-fix-v12.js','./js/patch-v13.js','./js/patch-v14.js','./js/supabase-config.js','./manifest.webmanifest'];
const injectPatch=async response=>{
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('patch-v13.css'))html=html.replace('</head>','<link rel="stylesheet" href="css/patch-v13.css"></head>');
  if(!html.includes('patch-v14.css'))html=html.replace('</head>','<link rel="stylesheet" href="css/patch-v14.css"></head>');
  if(!html.includes('calendar-fix-v12.js'))html=html.replace('</body>','<script type="module" src="js/calendar-fix-v12.js"></script></body>');
  if(!html.includes('patch-v13.js'))html=html.replace('</body>','<script type="module" src="js/patch-v13.js"></script></body>');
  if(!html.includes('patch-v14.js'))html=html.replace('</body>','<script type="module" src="js/patch-v14.js"></script></body>');
  return new Response(html,{status:response.status,statusText:response.statusText,headers:{...Object.fromEntries(response.headers.entries()),'content-type':'text/html; charset=utf-8'}});
};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url),nav=e.request.mode==='navigate',own=u.origin===self.location.origin;
  if(nav){
    e.respondWith(fetch(e.request).then(injectPatch).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put('./index.html',c));return r}).catch(async()=>{const cached=await caches.match('./index.html');return cached?injectPatch(cached):cached}));
    return;
  }
  if(own)e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));
});