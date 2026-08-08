const VERSION='72';

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

// Remove remnants of the former service-worker/app-cache architecture.
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

// Workout stack: ordered because the later modules enhance the DOM created by the earlier ones.
await load('./app-v53.js','workout core');
await load('./app-v54.js','workout interactions');
await load('./app-v55.js','device history');
await load('./coach-progressive-v57.js','progressive coach');
await load('./mobile-workout-v56.js','mobile workout UI');

// Independent features. A failure in one must never prevent the others from loading.
await load('./studio-page-v35.js','studio');
await load('./device-photo-v36.js','device photos');
await load('./progress-live-v62.js','progress charts');
await load('./status-fix-v26.js','shell polish');
await load('./sync-policy-v22.js','sync policy');

// Schedule controller loads last so old workout modules cannot win the dashboard hero afterwards.
await load('./schedule-v69.js','schedule rotation');
