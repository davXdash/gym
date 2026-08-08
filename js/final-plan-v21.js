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

// Exactly one schedule controller.
import './schedule-v69.js?v=71';

// The established V53/V55 workout stack is loaded by status-fix-v25.js.
// Restore the feature modules that are not part of that stack.
import './studio-page-v35.js?v=71';
import './device-photo-v36.js?v=71';
import './progress-live-v62.js?v=71';

for(const href of ['css/studio-page-v35.css','css/device-photo-v36.css','css/live-workout-v61.css']){
  if(document.querySelector(`link[href^="${href}"]`))continue;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=`${href}?v=71`;
  document.head.append(link);
}

export {};
