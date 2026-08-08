async function load(path,label){
  try{
    await import(path);
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
  link.href=path;
  link.dataset.liveStyle=path;
  document.head.append(link);
}

stylesheet('./css/live-workout-v61.css');
stylesheet('./css/workout-live.css');

await load('./app-v53.js','workout core');
await load('./app-v54.js','workout interactions');
await load('./app-v55.js','device history');
await load('./coach-progressive-v57.js','progressive coach');
await load('./mobile-workout-v61.js','mobile workout');

await load('./studio-page-v35.js','studio');
await load('./device-photo-v36.js','device photos');
await load('./progress-live-v62.js','progress charts');
await load('./status-fix-v26.js','shell polish');
await load('./sync-policy-v22.js','sync policy');
await load('./schedule-v69.js','schedule rotation');
