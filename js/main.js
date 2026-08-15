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
stylesheet('./css/photos.css');

await load('./data-loader.js','data loader');
await load('./workout.js','workout');
await load('./studio-page-v35.js','studio');
await load('./device-setup.js','device setup');
await load('./photos.js','photos');
await load('./progress.js','progress charts');
await load('./weight.js','weight');
await load('./export.js','data export');
await load('./status-fix-v26.js','shell polish');
await load('./sync-policy-v22.js','sync policy');
await load('./schedule.js','schedule rotation');
