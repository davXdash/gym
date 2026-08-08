// Single-page runtime bootstrap. No application cache while the app is under active development.
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

import './schedule-v69.js?v=69';
export {};
