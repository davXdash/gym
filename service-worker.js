const CACHE='gym-shell-v22';
const ASSETS=['./','./index.html','./css/app-v11.css','./css/patch-v13.css','./css/patch-v14.css','./css/training-v18.css','./css/ux-plan-v19.css','./css/progression-v20.css','./css/final-plan-v21.css','./js/app-v11.js','./js/app-fixes-v15.js','./js/training-v18.js','./js/ux-plan-v19.js','./js/progression-v20.js','./js/final-plan-v21.js','./js/sync-policy-v22.js','./js/supabase-config.js','./manifest.webmanifest','./IMG_3040.png','./IMG_3041.png','./IMG_3042.png','./IMG_3043.png','./IMG_3044.png','./IMG_3045.png','./IMG_3046.png','./IMG_3047.png','./IMG_3048.png','./IMG_3049.png','./IMG_3050.png','./IMG_3051.png','./IMG_3062.png','./IMG_3063.png','./IMG_3064.png','./IMG_3065.png','./IMG_3066.png','./IMG_3067.png','./IMG_3068.png','./IMG_3069.png','./IMG_3070.png','./IMG_3071.png'];
const prepareHtml=async response=>{
 const type=response.headers.get('content-type')||'';
 if(!type.includes('text/html'))return response;
 let html=await response.text();
 html=html.replace(/<script type="module" src="js\/(calendar-fix-v12|patch-v13|patch-v14|tracking-ui-v16)\.js"><\/script>/g,'');
 html=html.replace(/<link rel="stylesheet" href="css\/tracking-v16\.css">/g,'');
 for(const css of ['patch-v13.css','patch-v14.css','training-v18.css','ux-plan-v19.css','progression-v20.css','final-plan-v21.css'])if(!html.includes(css))html=html.replace('</head>',`<link rel="stylesheet" href="css/${css}"></head>`);
 for(const js of ['app-fixes-v15.js','training-v18.js','ux-plan-v19.js','progression-v20.js','final-plan-v21.js','sync-policy-v22.js'])if(!html.includes(js))html=html.replace('</body>',`<script type="module" src="js/${js}"></script></body>`);
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