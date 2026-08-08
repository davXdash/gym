// Single live runtime. No service worker or application cache while under active development.
(async()=>{
  try{
    if('serviceWorker' in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
    if('caches' in window){
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
  }catch(error){console.warn('Cache cleanup failed',error)}
})();

// Authoritative schedule/rotation logic.
import './schedule-v69.js?v=70';

// Feature-rich workout runtime restored from the last working stack.
import './app-v53.js?v=70';
import './app-v54.js?v=70';
import './app-v55.js?v=70';
import './coach-progressive-v57.js?v=70';
import './mobile-workout-v56.js?v=70';
import './studio-page-v35.js?v=70';
import './device-photo-v36.js?v=70';
import './progress-live-v62.js?v=70';

for(const href of [
  'css/app-v53.css','css/app-v54.css','css/app-v55.css',
  'css/coach-progressive-v57.css','css/mobile-workout-v56.css','css/live-workout-v61.css',
  'css/studio-page-v35.css','css/device-photo-v36.css'
]){
  if(document.querySelector(`link[href^="${href}"]`))continue;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=`${href}?v=70`;
  document.head.append(link);
}

export {};
