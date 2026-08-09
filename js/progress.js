import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11';
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null};
const val=v=>Number(v).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:2});
const shortDate=v=>{if(!v)return'';const raw=String(v);const d=new Date(raw);if(Number.isNaN(d.getTime()))return raw.slice(5,10).split('-').reverse().join('.');return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit'}).format(d)};
let painting=false;

function chart(rows,key,unit){
  const data=rows.map(r=>({value:num(r[key]),date:r.measured_at||r.created_at||r.workout_date||r.date})).filter(x=>x.value!=null).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  if(!data.length)return '<div class="clean-chart-empty">Noch keine Daten</div>';
  const values=data.map(x=>x.value),lo=Math.min(...values),hi=Math.max(...values),rawSpan=Math.max(.1,hi-lo),pad=Math.max(rawSpan*.28,unit==='kg'?.3:.6),min=Math.max(0,lo-pad),max=hi+pad,span=Math.max(.1,max-min);
  const W=390,H=255,L=66,R=18,T=28,B=58,plotW=W-L-R,plotH=H-T-B;
  const x=i=>L+i*plotW/Math.max(1,data.length-1),y=v=>T+(max-v)/span*plotH;
  let grid='';for(let i=0;i<5;i++){const yy=T+i*plotH/4,v=max-i*span/4;grid+=`<line class="grid" x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}"/><text class="y" x="${L-9}" y="${yy+4}" text-anchor="end">${val(v)}</text>`}
  const path=data.map((p,i)=>`${x(i)},${y(p.value)}`).join(' ');
  const points=data.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.value)}" r="5"/><text class="point" x="${x(i)}" y="${Math.max(14,y(p.value)-11)}" text-anchor="middle">${val(p.value)}</text>`).join('');
  const every=Math.max(1,Math.ceil(data.length/5));const labels=data.map((p,i)=>i%every===0||i===data.length-1?`<text class="x" x="${x(i)}" y="${H-22}" text-anchor="middle">${shortDate(p.date)}</text>`:'').join('');
  return `<svg class="clean-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlauf ${unit}"><text class="axis-title-y" x="14" y="${T+plotH/2}" transform="rotate(-90 14 ${T+plotH/2})" text-anchor="middle">${unit}</text><text class="axis-title-x" x="${L+plotW/2}" y="${H-4}" text-anchor="middle">Datum</text>${grid}<line class="axis" x1="${L}" y1="${T}" x2="${L}" y2="${H-B}"/><line class="axis" x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}"/><polyline points="${path}"/>${points}${labels}</svg>`;
}
function notes(row,key){try{return JSON.parse(row.notes||'{}')[key]??null}catch{return null}}
function measurement(rows,key){return rows.map(r=>({...r,value:key.startsWith('notes:')?notes(r,key.slice(6)):r[key]})).filter(r=>num(r.value)!=null)}
function card(title,rows){return `<article class="chart-card card clean-extra"><h3>${title}</h3><div>${chart(rows,'value','cm')}</div></article>`}
function setHtml(root,html){if(root&&root.innerHTML!==html)root.innerHTML=html}

function renderCharts(){
  if(painting)return;painting=true;
  try{
    const s=read(SNAP,{weights:[],measurements:[]}),weights=s.weights||[],measurements=s.measurements||[];
    const weight=chart(weights,'weight_kg','kg'),waistRows=measurement(measurements,'waist_cm'),waist=chart(waistRows,'value','cm');
    setHtml(q('#weight-chart'),weight);setHtml(q('#weight-chart-2'),weight);setHtml(q('#waist-chart'),waist);setHtml(q('#waist-chart-2'),waist);
    const page=q('#page-progress');if(page){qa('.clean-extra',page).forEach(x=>x.remove());const defs=[['Brust','chest_cm'],['Schulter','shoulder_cm'],['Oberarm links','upper_arm_left_cm'],['Oberarm rechts','upper_arm_right_cm'],['Bauch','notes:abdomen_cm']];for(const [title,key] of defs){const rows=measurement(measurements,key);if(rows.length)page.insertAdjacentHTML('beforeend',card(title,rows))}}
  }finally{painting=false}
}
function weightHistory(){
  const page=q('#page-weight'),s=read(SNAP,{weights:[]});if(!page)return;let box=q('#clean-weight-history',page);if(!box){box=document.createElement('section');box.id='clean-weight-history';box.className='card clean-weight-history';page.append(box)}
  const rows=[...(s.weights||[])].sort((a,b)=>String(b.measured_at||'').localeCompare(String(a.measured_at||'')));
  box.innerHTML=`<h3>Gespeicherte Werte</h3>${rows.length?rows.map(r=>`<article data-id="${r.id||''}"><div><strong>${val(r.weight_kg)} kg</strong><small>${r.measured_at?new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(r.measured_at)):''}</small></div><button data-edit>Bearbeiten</button><button data-delete>Löschen</button></article>`).join(''):'<p>Noch keine Werte.</p>'}`;
  box.onclick=async e=>{const row=e.target.closest('article'),item=rows.find(r=>String(r.id)===row?.dataset.id);if(!item)return;if(e.target.closest('[data-edit]')){const raw=prompt('Gewicht in kg',String(item.weight_kg).replace('.',','));if(raw==null)return;const n=num(raw);if(!(n>=30&&n<=300))return alert('Ungültiges Gewicht.');const res=await supabase.from('weigh_ins').update({weight_kg:n}).eq('id',item.id);if(res.error)return alert(res.error.message);localStorage.removeItem(SNAP);location.reload()}if(e.target.closest('[data-delete]')){if(!confirm(`${val(item.weight_kg)} kg löschen?`))return;const res=await supabase.from('weigh_ins').delete().eq('id',item.id);if(res.error)return alert(res.error.message);localStorage.removeItem(SNAP);location.reload()}};
}
function style(){if(q('#clean-progress-style'))return;const s=document.createElement('style');s.id='clean-progress-style';s.textContent='.clean-chart{display:block;width:100%;height:auto;overflow:visible}.clean-chart .grid{stroke:var(--line,#e2e8e2);stroke-width:1}.clean-chart .axis{stroke:var(--muted,#778279);stroke-width:1.3}.clean-chart polyline{fill:none;stroke:#356b4d;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}.clean-chart circle{fill:#356b4d;stroke:var(--surface,#fff);stroke-width:2}.clean-chart text{font-family:inherit}.clean-chart .x,.clean-chart .y,.clean-chart .axis-title-x,.clean-chart .axis-title-y{fill:var(--muted,#707a72);font-size:10px}.clean-chart .axis-title-x,.clean-chart .axis-title-y{font-weight:800}.clean-chart .point{fill:var(--text,#244f38);font-size:10px;font-weight:800}.clean-chart-empty{display:grid;place-items:center;min-height:180px;color:var(--muted,#737973)}.clean-weight-history{margin-top:14px;padding:14px}.clean-weight-history article{display:grid;grid-template-columns:1fr auto auto;gap:7px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}.clean-weight-history small{display:block;color:var(--muted);font-size:.7rem;margin-top:2px}.clean-weight-history button{min-height:38px;border:1px solid var(--line);border-radius:11px;background:var(--surface-2);padding:0 9px}#page-photos{width:100%;max-width:720px;margin:0 auto;box-sizing:border-box}#page-photos .photo-placeholder{min-height:220px;display:grid;place-items:center;padding:24px;border-radius:24px;text-align:center}';document.head.append(s)}
function enhance(){style();renderCharts();weightHistory()}
function schedule(){requestAnimationFrame(enhance);setTimeout(enhance,80);setTimeout(enhance,260);setTimeout(enhance,700)}
function watch(){['#weight-chart','#weight-chart-2','#waist-chart','#waist-chart-2'].forEach(sel=>{const root=q(sel);if(!root||root.dataset.cleanWatch)return;root.dataset.cleanWatch='1';new MutationObserver(()=>{if(!painting)setTimeout(renderCharts,30)}).observe(root,{childList:true,subtree:true})})}
document.addEventListener('click',e=>{if(e.target.closest('[data-page="progress"],[data-page="weight"],[data-page="photos"],[data-page-link="weight"],#save-weight,#save-measurement)){schedule();setTimeout(watch,40)}},true);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{schedule();setTimeout(watch,500)},{once:true});else{schedule();setTimeout(watch,500)}
