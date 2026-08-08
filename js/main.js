const VERSION='73';

async function load(path,label){
  try{
    await import(`${path}?v=${VERSION}`);
    console.info(`[GYM] ${label} loaded`);
    return true;
  }catch(error){
    console.error(`[GYM] ${label} failed`,error);
    return false;
  }
}

function stylesheet(path){
  if(document.querySelector(`link[data-live-style="${path}"]`))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=`${path}?v=${VERSION}`;
  link.dataset.liveStyle=path;
  document.head.append(link);
}

// No application-cache/service-worker runtime. Pages serves the current files directly.
try{
  if('serviceWorker' in navigator){
    const regs=await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r=>r.unregister()));
  }
  if('caches' in window){
    const keys=await caches.keys();
    await Promise.all(keys.map(k=>caches.delete(k)));
  }
}catch(error){console.warn('[GYM] cache cleanup failed',error)}

// The V61 interaction controller and its V61 stylesheet are one feature.
// Loading only the JS created the old/new hybrid UI seen on iPhone.
stylesheet('./css/live-workout-v61.css');

await load('./app-v53.js','workout core');
await load('./app-v54.js','workout interactions');
await load('./app-v55.js','device history');
await load('./coach-progressive-v57.js','progressive coach');
await load('./mobile-workout-v56.js','V61 mobile workout UI');

// Independent features: one failure must not take the rest of the app down.
await load('./studio-page-v35.js','studio');
await load('./device-photo-v36.js','device photos');
await load('./progress-live-v62.js','progress charts');
await load('./status-fix-v26.js','shell polish');
await load('./sync-policy-v22.js','sync policy');

// Authoritative schedule owner loads last so older workout modules cannot overwrite the hero.
await load('./schedule-v69.js','schedule rotation');
