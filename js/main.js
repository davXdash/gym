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

stylesheet('./css/workout.css');

await load('./app-v53.js','workout data engine');
await load('./app-v54.js','workout add/reorder actions');
await load('./app-v55.js','device history');
await load('./workout.js','workout interface');

await load('./studio-page-v35.js','studio');
await load('./device-photo-v36.js','device photos');
await load('./progress.js','progress charts');
await load('./status-fix-v26.js','shell polish');
await load('./sync-policy-v22.js','sync policy');
await load('./schedule.js','schedule rotation');
