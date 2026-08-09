import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11',QUEUE='gym-queue-v11',OFF='gym-offline-v11';
const q=(s,r=document)=>r.querySelector(s);
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null};
const localDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(new Date());
const fmtWeight=v=>num(v)==null?'–':num(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtTick=v=>num(v)==null?'':num(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
const online=()=>navigator.onLine&&localStorage.getItem(OFF)!=='1';
let painting=false,saving=false;

function berlinMinute(value){
  const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value||'').slice(0,16);
  const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d);
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
function shortDate(value,withTime=true){
  const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value||'').slice(0,16);
  return new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',day:'2-digit',month:'2-digit',...(withTime?{hour:'2-digit',minute:'2-digit'}:{})}).format(d).replace(',','');
}
function weights(){return [...(read(SNAP,{weights:[]}).weights||[])].filter(x=>num(x.weight_kg)!=null).sort((a,b)=>new Date(a.measured_at)-new Date(b.measured_at))}
function latest(){return weights().at(-1)||null}

function chart(rows){
  if(!rows.length)return'<div class="weight-chart-empty">Noch keine Gewichtsdaten</div>';
  const data=rows.map(r=>({value:num(r.weight_kg),date:r.measured_at}));
  const vals=data.map(x=>x.value),lo=Math.min(...vals),hi=Math.max(...vals),pad=Math.max(.15,(hi-lo)*.18),min=Math.floor((lo-pad)*10)/10,max=Math.ceil((hi+pad)*10)/10,span=Math.max(.2,max-min);
  const W=420,H=280,L=68,R=18,T=28,B=64,plotW=W-L-R,plotH=H-T-B;
  const x=i=>L+i*plotW/Math.max(1,data.length-1),y=v=>T+(max-v)/span*plotH;
  let grid='';for(let i=0;i<5;i++){const yy=T+i*plotH/4,v=max-i*span/4;grid+=`<line class="wc-grid" x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}"/><text class="wc-y" x="${L-9}" y="${yy+4}" text-anchor="end">${fmtTick(v)}</text>`}
  const step=Math.max(1,Math.ceil(data.length/6));
  const xlabels=data.map((p,i)=>(i%step===0||i===data.length-1)?`<text class="wc-x" x="${x(i)}" y="${H-28}" text-anchor="middle">${shortDate(p.date,data.length<8)}</text>`:'').join('');
  const labelStep=data.length<=12?1:Math.ceil(data.length/8);
  const points=data.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.value)}" r="5"/>${(i%labelStep===0||i===data.length-1)?`<text class="wc-point" x="${x(i)}" y="${Math.max(16,y(p.value)-11)}" text-anchor="middle">${fmtWeight(p.value)}</text>`:''}`).join('');
  const poly=data.map((p,i)=>`${x(i)},${y(p.value)}`).join(' ');
  return`<svg class="weight-chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gewichtsverlauf"><text class="wc-unit" x="12" y="18">kg</text>${grid}<line class="wc-axis" x1="${L}" y1="${T}" x2="${L}" y2="${H-B}"/><line class="wc-axis" x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}"/><polyline class="wc-line" points="${poly}"/>${points}${xlabels}<text class="wc-axis-title" x="${(L+W-R)/2}" y="${H-5}" text-anchor="middle">Datum / Messzeit</text><text class="wc-axis-title" x="14" y="${T+plotH/2}" text-anchor="middle" transform="rotate(-90 14 ${T+plotH/2})">Gewicht in kg</text></svg>`;
}

function paint(){
  if(painting)return;painting=true;
  try{
    const rows=weights(),last=rows.at(-1),dash=q('#latest-weight');if(dash)dash.textContent=last?`${fmtWeight(last.weight_kg)} kg`:'Noch kein Gewicht';
    const html=chart(rows);['#weight-chart','#weight-chart-2'].forEach(sel=>{const root=q(sel);if(root&&root.dataset.weightOwner!=='painting'){root.dataset.weightOwner='painting';root.innerHTML=html;root.dataset.weightOwner='1'}});
  }finally{painting=false}
}

function style(){if(q('#weight-owner-style'))return;const s=document.createElement('style');s.id='weight-owner-style';s.textContent=`.weight-chart-svg{display:block;width:100%;height:auto;min-height:250px;overflow:visible}.weight-chart-svg .wc-grid{stroke:var(--line,#dde3dd);stroke-width:1}.weight-chart-svg .wc-axis{stroke:#69746c;stroke-width:1.4}.weight-chart-svg .wc-line{fill:none;stroke:#477259;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}.weight-chart-svg circle{fill:#477259;stroke:var(--surface,#fff);stroke-width:2.5}.weight-chart-svg text{font-family:inherit}.weight-chart-svg .wc-y,.weight-chart-svg .wc-x,.weight-chart-svg .wc-unit,.weight-chart-svg .wc-axis-title{fill:var(--muted,#6f7871);font-size:11px}.weight-chart-svg .wc-point{fill:var(--text,#151a16);font-size:10px;font-weight:800}.weight-chart-empty{display:grid;place-items:center;min-height:220px;color:var(--muted,#6f7871)}#weight-chart,#weight-chart-2{overflow:visible!important}`;document.head.append(s)}

async function duplicateAtMinute(minute){
  if(weights().some(r=>berlinMinute(r.measured_at)===minute))return true;
  if(!online())return false;
  const {data:{session}}=await supabase.auth.getSession();if(!session)return false;
  const recent=await supabase.from('weigh_ins').select('id,measured_at').eq('user_id',session.user.id).order('measured_at',{ascending:false}).limit(80);
  if(recent.error)throw recent.error;return(recent.data||[]).some(r=>berlinMinute(r.measured_at)===minute);
}

async function saveWeight(e){
  const button=e.target.closest('#save-weight');if(!button)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(saving)return;
  const status=q('#weight-status'),input=q('#weight-input'),time=q('#weight-time'),v=num(input?.value);if(!(v>=30&&v<=300)){if(status)status.textContent='Bitte gültiges Gewicht eintragen.';return}
  const clock=time?.value||new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
  const minute=`${localDay()}T${clock}`;saving=true;button.disabled=true;
  try{
    if(await duplicateAtMinute(minute)){if(status)status.textContent=`Für ${clock} Uhr ist bereits ein Gewicht gespeichert.`;return}
    const localDate=new Date(`${localDay()}T${clock}:00`),measured_at=localDate.toISOString();
    const val=n=>q(`[data-chip-group="${n}"] .active`)?.dataset.value||'unknown',trained=val('trained');
    const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Bitte neu anmelden.');
    const payload={user_id:session.user.id,weight_kg:v,measured_at,toilet_status:val('toilet'),food_status:val('food'),late_meal:val('late'),trained_previous_day:trained==='yesterday',notes:trained==='today'?'training_today':''};
    if(online()){
      const r=await supabase.from('weigh_ins').insert(payload);if(r.error)throw r.error;
    }else{
      const s=read(SNAP,{weights:[]});s.weights=[...(s.weights||[]),payload];write(SNAP,s);const queue=read(QUEUE,[]);queue.push({type:'weight',payload,queued_at:new Date().toISOString()});write(QUEUE,queue);
    }
    if(status)status.textContent='Gespeichert.';
    const s=read(SNAP,{weights:[]});if(!online()){paint()}else{localStorage.removeItem(SNAP);location.reload()}
  }catch(err){if(status)status.textContent=err?.message||String(err)}finally{saving=false;button.disabled=false}
}

function watch(){const roots=['#weight-chart','#weight-chart-2'].map(q).filter(Boolean);const o=new MutationObserver(()=>{if(!painting)setTimeout(paint,0)});roots.forEach(r=>o.observe(r,{childList:true,subtree:true}));}
function install(){style();document.addEventListener('click',saveWeight,true);paint();watch();document.addEventListener('click',e=>{if(e.target.closest('[data-page="weight"],[data-page="progress"],[data-page-link="weight"]'))setTimeout(paint,60)},true);window.addEventListener('pageshow',()=>setTimeout(paint,80))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();