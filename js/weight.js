import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11',QUEUE='gym-queue-v11',OFF='gym-offline-v11';
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null};
const online=()=>navigator.onLine&&localStorage.getItem(OFF)!=='1';
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(new Date());
const nowClock=()=>new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
const kg=v=>num(v)==null?'–':num(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
let saving=false,painting=false;

function berlinMinute(value){
 const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value||'').slice(0,16);
 const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d);
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
function stamp(value){const d=new Date(value);return Number.isNaN(d.getTime())?String(value||''):new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d).replace(',',' ·')}
function rows(){return [...(read(SNAP,{weights:[]}).weights||[])].filter(x=>num(x.weight_kg)!=null).sort((a,b)=>new Date(a.measured_at)-new Date(b.measured_at))}
function latest(){return rows().at(-1)||null}

function setCurrentTime(force=false){const el=q('#weight-time');if(el&&(force||!el.value))el.value=nowClock()}

function bindIndependentChips(){
 qa('[data-chip-group]').forEach(group=>{
  qa('.chip',group).forEach(button=>{
   if(button.dataset.weightBound==='1')return;button.dataset.weightBound='1';
   button.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    qa('.chip',group).forEach(x=>x.classList.remove('active'));button.classList.add('active');
   },true);
  });
 });
}

function summary(data){
 const last=data.at(-1),prev=data.at(-2),values=data.map(x=>num(x.weight_kg)),change=last&&prev?num(last.weight_kg)-num(prev.weight_kg):null,min=values.length?Math.min(...values):null,max=values.length?Math.max(...values):null;
 return`<div class="weight-summary"><article><small>AKTUELL</small><strong>${last?kg(last.weight_kg):'–'} kg</strong><span>${last?stamp(last.measured_at):'Noch kein Wert'}</span></article><article><small>LETZTE ÄNDERUNG</small><strong>${change==null?'–':`${change>0?'+':''}${kg(change)} kg`}</strong><span>gegenüber vorher</span></article><article><small>SPANNE</small><strong>${min==null?'–':`${kg(min)}–${kg(max)}`}</strong><span>kg · sichtbarer Zeitraum</span></article></div>`;
}

function coordinateChart(data){
 if(!data.length)return'<div class="weight-empty">Noch keine Gewichtsdaten.</div>';
 const shown=data.slice(-20),values=shown.map(x=>num(x.weight_kg)),lo=Math.min(...values),hi=Math.max(...values),padding=Math.max(.20,(hi-lo)*.25),min=Math.floor((lo-padding)*10)/10,max=Math.ceil((hi+padding)*10)/10,span=Math.max(.4,max-min);
 const W=440,H=300,L=66,R=18,T=28,B=62,PW=W-L-R,PH=H-T-B,x=i=>L+i*PW/Math.max(1,shown.length-1),y=v=>T+(max-v)/span*PH;
 let grid='';for(let i=0;i<6;i++){const yy=T+i*PH/5,v=max-i*span/5;grid+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" class="wg-grid"/><text x="${L-10}" y="${yy+4}" text-anchor="end" class="wg-y">${kg(v)}</text>`}
 const labelIndexes=new Set([0,shown.length-1]);if(shown.length>2)labelIndexes.add(Math.floor((shown.length-1)/2));if(shown.length>6){labelIndexes.add(Math.floor((shown.length-1)/3));labelIndexes.add(Math.floor((shown.length-1)*2/3))}
 const dots=shown.map((r,i)=>`<g class="wg-point"><circle cx="${x(i)}" cy="${y(num(r.weight_kg))}" r="5"/><text x="${x(i)}" y="${Math.max(16,y(num(r.weight_kg))-11)}" text-anchor="middle">${kg(r.weight_kg)}</text></g>`).join('');
 const xlabels=shown.map((r,i)=>labelIndexes.has(i)?`<text x="${x(i)}" y="${H-30}" text-anchor="middle" class="wg-x">${new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',day:'2-digit',month:'2-digit'}).format(new Date(r.measured_at))}</text>`:'').join('');
 const segments=shown.slice(1).map((r,i)=>`<line x1="${x(i)}" y1="${y(num(shown[i].weight_kg))}" x2="${x(i+1)}" y2="${y(num(r.weight_kg))}" class="wg-segment"/>`).join('');
 return`<div class="weight-plot"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gewicht nach Messdatum"><text x="12" y="18" class="wg-unit">kg</text>${grid}<line x1="${L}" y1="${T}" x2="${L}" y2="${H-B}" class="wg-axis"/><line x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}" class="wg-axis"/>${segments}${dots}${xlabels}<text x="${(L+W-R)/2}" y="${H-5}" text-anchor="middle" class="wg-title">Messdatum</text></svg></div>`;
}

function historyList(data){
 const shown=[...data].reverse().slice(0,8);return`<div class="weight-history"><div class="weight-history-head"><strong>Letzte Messungen</strong><span>${data.length} Werte</span></div>${shown.map((r,i)=>{const prev=shown[i+1],delta=prev?num(r.weight_kg)-num(prev.weight_kg):null;return`<div class="weight-history-row"><span>${stamp(r.measured_at)}</span><strong>${kg(r.weight_kg)} kg</strong><small>${delta==null?'':`${delta>0?'+':''}${kg(delta)} kg`}</small></div>`}).join('')}</div>`;
}

function replaceChart(){
 if(painting)return;painting=true;
 try{
  const data=rows(),last=data.at(-1),dash=q('#latest-weight');if(dash)dash.textContent=last?`${kg(last.weight_kg)} kg`:'Noch kein Gewicht';
  const main=q('#weight-chart');if(main){main.dataset.weightOwner='1';main.innerHTML=`<div class="weight-dashboard">${summary(data)}${coordinateChart(data)}${historyList(data)}</div>`}
  const progress=q('#weight-chart-2');if(progress){progress.dataset.weightOwner='1';progress.innerHTML=`<div class="weight-dashboard compact">${summary(data)}${coordinateChart(data)}</div>`}
 }finally{painting=false}
}

function style(){if(q('#weight-style'))return;const s=document.createElement('style');s.id='weight-style';s.textContent=`
#weight-chart,#weight-chart-2{min-height:0!important;overflow:visible!important}.weight-dashboard{display:grid;gap:14px}.weight-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.weight-summary article{padding:11px;border:1px solid var(--line,#dce2dc);border-radius:15px;background:var(--surface-2,#f6f8f5)}.weight-summary small,.weight-summary span{display:block;color:var(--muted,#707970);font-size:.62rem}.weight-summary strong{display:block;margin:5px 0 3px;font-size:.92rem}.weight-plot{padding:8px 2px 0;border:1px solid var(--line,#dce2dc);border-radius:17px;background:var(--surface,#fff);overflow:hidden}.weight-plot svg{display:block;width:100%;height:auto;min-height:260px}.wg-grid{stroke:var(--line,#e0e5e0);stroke-width:1}.wg-axis{stroke:#667269;stroke-width:1.5}.wg-segment{stroke:#789381;stroke-width:2.2}.wg-point circle{fill:#356b4d;stroke:var(--surface,#fff);stroke-width:2.5}.wg-point text{fill:var(--text,#151a16);font-size:10px;font-weight:800}.wg-y,.wg-x,.wg-unit,.wg-title{fill:var(--muted,#707970);font-size:10px}.weight-history{border:1px solid var(--line,#dce2dc);border-radius:17px;overflow:hidden}.weight-history-head,.weight-history-row{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;padding:10px 12px}.weight-history-head{background:var(--surface-2,#f6f8f5)}.weight-history-head span,.weight-history-row span,.weight-history-row small{color:var(--muted,#707970);font-size:.7rem}.weight-history-row{border-top:1px solid var(--line,#e0e5e0)}.weight-history-row strong{font-size:.8rem}.weight-empty{display:grid;place-items:center;min-height:180px;color:var(--muted,#707970)}@media(max-width:430px){.weight-summary{grid-template-columns:1fr}.weight-summary article{display:grid;grid-template-columns:1fr auto;align-items:center}.weight-summary article small,.weight-summary article span{grid-column:1}.weight-summary article strong{grid-column:2;grid-row:1/3;margin:0}.weight-history-head,.weight-history-row{grid-template-columns:1fr auto}.weight-history-row small{grid-column:2}.weight-plot svg{min-height:240px}}
`;document.head.append(s)}

async function refreshWeights(){
 if(!online()){replaceChart();return}
 const {data:{session}}=await supabase.auth.getSession();if(!session)return;
 const r=await supabase.from('weigh_ins').select('*').eq('user_id',session.user.id).order('measured_at');if(r.error)throw r.error;
 const snap=read(SNAP,{weights:[]});snap.weights=r.data||[];write(SNAP,snap);replaceChart();
}
async function duplicateAtMinute(minute){if(rows().some(r=>berlinMinute(r.measured_at)===minute))return true;if(!online())return false;const {data:{session}}=await supabase.auth.getSession();if(!session)return false;const r=await supabase.from('weigh_ins').select('id,measured_at').eq('user_id',session.user.id).order('measured_at',{ascending:false}).limit(100);if(r.error)throw r.error;return(r.data||[]).some(x=>berlinMinute(x.measured_at)===minute)}

async function saveWeight(e){
 const button=e.target.closest('#save-weight');if(!button)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(saving)return;
 const status=q('#weight-status'),input=q('#weight-input'),time=q('#weight-time'),v=num(input?.value);if(!(v>=30&&v<=300)){if(status)status.textContent='Bitte gültiges Gewicht eintragen.';return}
 const clock=time?.value||nowClock(),minute=`${day()}T${clock}`;saving=true;button.disabled=true;
 try{
  if(await duplicateAtMinute(minute)){if(status)status.textContent=`Für ${clock} Uhr ist bereits ein Gewicht gespeichert.`;return}
  const localDate=new Date(`${day()}T${clock}:00`),measured_at=localDate.toISOString(),val=n=>q(`[data-chip-group="${n}"] .active`)?.dataset.value||'unknown',trained=val('trained');
  const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Bitte neu anmelden.');const payload={user_id:session.user.id,weight_kg:v,measured_at,toilet_status:val('toilet'),food_status:val('food'),late_meal:val('late'),trained_previous_day:trained==='yesterday',notes:trained==='today'?'training_today':''};
  if(online()){const r=await supabase.from('weigh_ins').insert(payload);if(r.error)throw r.error;await refreshWeights()}else{const s=read(SNAP,{weights:[]});s.weights=[...(s.weights||[]),payload];write(SNAP,s);const queue=read(QUEUE,[]);queue.push({type:'weight',payload,queued_at:new Date().toISOString()});write(QUEUE,queue);replaceChart()}
  if(status)status.textContent='Gespeichert.';setCurrentTime(true);
 }catch(err){if(status)status.textContent=err?.message||String(err)}finally{saving=false;button.disabled=false}
}

function protectChart(){const roots=['#weight-chart','#weight-chart-2'].map(q).filter(Boolean);const observer=new MutationObserver(()=>{if(!painting)setTimeout(replaceChart,0)});roots.forEach(r=>observer.observe(r,{childList:true,subtree:true}))}
function install(){style();setCurrentTime();bindIndependentChips();replaceChart();protectChart();document.addEventListener('click',saveWeight,true);document.addEventListener('click',e=>{if(e.target.closest('[data-page="weight"],[data-page="progress"],[data-page-link="weight"]'))setTimeout(()=>{setCurrentTime(true);bindIndependentChips();replaceChart()},40)},true);window.addEventListener('pageshow',()=>setTimeout(()=>{setCurrentTime();bindIndependentChips();replaceChart()},60))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();