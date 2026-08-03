const CACHE='gym-shell-v15';
const ASSETS=['./','./index.html','./css/app-v11.css','./css/patch-v13.css','./css/patch-v14.css','./js/app-v11.js','./js/app-fixes-v15.js','./js/supabase-config.js','./manifest.webmanifest','./IMG_3043.png','./IMG_3045.png','./IMG_3046.png','./IMG_3050.png','./pics_johnreed/IMG_3052.png','./pics_johnreed/IMG_3056.png','./IMG_3064.png','./IMG_3065.png','./IMG_3066.png','./IMG_3070.png'];
const prepareHtml=async response=>{
 const type=response.headers.get('content-type')||'';
 if(!type.includes('text/html'))return response;
 let html=await response.text();
 html=html.replace(/<script type="module" src="js\/(calendar-fix-v12|patch-v13|patch-v14)\.js"><\/script>/g,'');
 if(!html.includes('patch-v13.css'))html=html.replace('</head>','<link rel="stylesheet" href="css/patch-v13.css"></head>');
 if(!html.includes('patch-v14.css'))html=html.replace('</head>','<link rel="stylesheet" href="css/patch-v14.css"></head>');
 if(!html.includes('app-fixes-v15.js'))html=html.replace('</body>','<script type="module" src="js/app-fixes-v15.js"></script></body>');
 return new Response(html,{status:response.status,statusText:response.statusText,headers:{...Object.fromEntries(response.headers.entries()),'content-type':'text/html; charset=utf-8'}});
};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url),navigation=event.request.mode==='navigate',own=url.origin===self.location.origin;
 if(navigation){event.respondWith(fetch(event.request).then(prepareHtml).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy));return response}).catch(async()=>{const cached=await caches.match('./index.html');return cached?prepareHtml(cached):cached}));return}
 if(own)event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request)));
});