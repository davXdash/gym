const STUDIO_KEY_V36='gym-studio-profile-v32';
const PHOTO_DB_V36='gym-progress-photos-v36';
const q36=(s,r=document)=>r.querySelector(s),qa36=(s,r=document)=>[...r.querySelectorAll(s)];
const read36=(k,f={})=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};

function studioProfile36(){return read36(STUDIO_KEY_V36,{studio:'John Reed Essen',devices:{}})}
function norm36(s=''){return s.toLowerCase().replace(/[ä]/g,'a').replace(/[ö]/g,'o').replace(/[ü]/g,'u').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim()}
function findDevice36(name){
 const devices=studioProfile36().devices||{},needle=norm36(name);
 const exact=Object.entries(devices).find(([n])=>norm36(n)===needle);
 if(exact)return {name:exact[0],...exact[1]};
 const partial=Object.entries(devices).find(([n])=>needle.includes(norm36(n))||norm36(n).includes(needle));
 return partial?{name:partial[0],...partial[1]}:null;
}
function setupLines36(device){
 if(!device)return [];
 const s=device.setup||{};
 const labels={seat:'Sitzhöhe',backrest:'Rückenlehne',chest_pad:'Brustpolster',start_position:'Startposition',bench_angle:'Bankwinkel',grip:'Griff',weight_steps:'Gewichtsstufen',notes:'Notiz'};
 return Object.entries(labels).filter(([k])=>String(s[k]||'').trim()).map(([k,l])=>`<span><b>${l}</b>${s[k]}</span>`);
}
function injectDeviceSetup36(){
 qa36('#exercise-list .exercise-card').forEach(card=>{
  const title=q36('h3',card)?.textContent?.trim();if(!title)return;
  const device=findDevice36(title);let box=q36('.device-setup-v36',card);
  if(!box){box=document.createElement('section');box.className='device-setup-v36';const anchor=q36('.variant-shell',card)||q36('.exercise-v18-head',card)||q36('h3',card);anchor?.insertAdjacentElement('afterend',box)}
  const lines=setupLines36(device);
  box.innerHTML=device&&lines.length?`<div class="device-setup-head-v36"><strong>Dein Geräte-Setup</strong><small>${studioProfile36().studio||'Studio'}</small></div><div class="device-setup-grid-v36">${lines.join('')}</div>`:`<button type="button" class="device-setup-link-v36" data-open-studio-v36>Geräte-Setup ergänzen</button>`;
 });
}
function openStudio36(){document.querySelector('[data-page="studio"]')?.click()}

function openDb36(){return new Promise((resolve,reject)=>{const req=indexedDB.open(PHOTO_DB_V36,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('photos'))db.createObjectStore('photos',{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function savePhoto36(record){const db=await openDb36();return new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
async function listPhotos36(){const db=await openDb36();return new Promise((resolve,reject)=>{const req=db.transaction('photos').objectStore('photos').getAll();req.onsuccess=()=>resolve(req.result.sort((a,b)=>b.created_at.localeCompare(a.created_at)));req.onerror=()=>reject(req.error)})}
let stream36=null,currentPose36='front';
function photoMarkup36(){return `<section class="photo-studio-v36"><div class="photo-intro-v36"><h3>Geführte Aufnahme</h3><p>Stativ fest positionieren. Kamera und Rahmen bleiben für vergleichbare Bilder gleich.</p></div><div class="pose-tabs-v36"><button class="active" data-pose-v36="front">Front</button><button data-pose-v36="left">Links</button><button data-pose-v36="right">Rechts</button><button data-pose-v36="back">Rücken</button></div><div class="camera-stage-v36"><video id="photo-video-v36" playsinline muted></video><canvas id="photo-canvas-v36" hidden></canvas><div class="body-guide-v36" data-pose="front"><div class="head-guide-v36"></div><div class="torso-guide-v36"></div><div class="leg-guide-v36 left"></div><div class="leg-guide-v36 right"></div><i class="line shoulder"></i><i class="line hip"></i><span>Ganzer Körper · Füße an die Markierungen</span></div></div><div class="camera-actions-v36"><button id="camera-start-v36" class="secondary">Kamera starten</button><button id="camera-capture-v36" class="primary" disabled>Foto aufnehmen</button><button id="camera-stop-v36" class="secondary" disabled>Kamera stoppen</button></div><p id="photo-status-v36" class="photo-status-v36"></p><div id="photo-gallery-v36" class="photo-gallery-v36"></div></section>`}
async function renderGallery36(){const root=q36('#photo-gallery-v36');if(!root)return;const rows=await listPhotos36();root.innerHTML=rows.length?rows.slice(0,12).map(r=>`<article><img src="${r.data_url}" alt="Fortschrittsfoto ${r.pose}"><div><strong>${({front:'Front',left:'Links',right:'Rechts',back:'Rücken'})[r.pose]}</strong><small>${new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(r.created_at))}</small></div></article>`).join(''):'<p>Noch keine lokalen Fortschrittsfotos.</p>'}
function buildPhotos36(){const page=q36('#page-photos');if(!page||q36('.photo-studio-v36',page))return;page.querySelector('.photo-placeholder')?.remove();page.insertAdjacentHTML('beforeend',photoMarkup36());bindPhotos36();renderGallery36()}
async function startCamera36(){const status=q36('#photo-status-v36');try{stream36=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1920},height:{ideal:1080}},audio:false});const video=q36('#photo-video-v36');video.srcObject=stream36;await video.play();q36('#camera-capture-v36').disabled=false;q36('#camera-stop-v36').disabled=false;q36('#camera-start-v36').disabled=true;status.textContent='Kamera aktiv. Stelle dich vollständig in die Schablone.'}catch(e){status.textContent=`Kamera konnte nicht geöffnet werden: ${e.message}`}}
function stopCamera36(){stream36?.getTracks().forEach(t=>t.stop());stream36=null;const video=q36('#photo-video-v36');if(video)video.srcObject=null;q36('#camera-capture-v36').disabled=true;q36('#camera-stop-v36').disabled=true;q36('#camera-start-v36').disabled=false}
async function capture36(){const video=q36('#photo-video-v36'),canvas=q36('#photo-canvas-v36'),status=q36('#photo-status-v36');if(!video?.videoWidth)return;canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0);const data_url=canvas.toDataURL('image/jpeg',.88);await savePhoto36({id:crypto.randomUUID(),pose:currentPose36,created_at:new Date().toISOString(),data_url,studio:studioProfile36().studio||null});status.textContent='Foto lokal und offlinefähig gespeichert.';await renderGallery36()}
function bindPhotos36(){q36('#camera-start-v36').onclick=startCamera36;q36('#camera-stop-v36').onclick=stopCamera36;q36('#camera-capture-v36').onclick=capture36;qa36('[data-pose-v36]').forEach(b=>b.onclick=()=>{currentPose36=b.dataset.poseV36;qa36('[data-pose-v36]').forEach(x=>x.classList.toggle('active',x===b));q36('.body-guide-v36').dataset.pose=currentPose36})}

const observer36=new MutationObserver(()=>requestAnimationFrame(injectDeviceSetup36));
window.addEventListener('load',()=>{setTimeout(()=>{buildPhotos36();injectDeviceSetup36();const list=q36('#exercise-list');if(list)observer36.observe(list,{childList:true,subtree:true})},900)});
document.addEventListener('click',e=>{if(e.target.closest('[data-open-studio-v36]'))openStudio36();if(e.target.closest('[data-page="photos"],[data-page-link="photos"]'))setTimeout(buildPhotos36,50);if(e.target.closest('#close-dialog'))stopCamera36()},true);
