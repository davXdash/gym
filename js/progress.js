const SNAP='gym-snapshot-v11';
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null};
const val=v=>Number(v).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:2});
const shortDate=v=>{if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v).slice(5,10).split('-').reverse().join('.');return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit'}).format(d)};

const DEFINITIONS=[
 ['Taille','waist_cm'],['Brust','chest_cm'],['Schulter','shoulder_cm'],['Bauch','notes:abdomen_cm'],['Oberarm links','upper_arm_left_cm'],['Oberarm rechts','upper_arm_right_cm'],['Hüfte','notes:hip_cm'],['Oberschenkel links','notes:thigh_left_cm'],['Oberschenkel rechts','notes:thigh_right_cm'],['Hals','notes:neck_cm']
];

function notes(row,key){try{return JSON.parse(row.notes||'{}')[key]??null}catch{return null}}
function measurement(rows,key){return rows.map(r=>({value:key.startsWith('notes:')?notes(r,key.slice(6)):r[key],date:r.measured_at})).filter(r=>num(r.value)!=null)}
function chart(rows){
 if(!rows.length)return'<div class="clean-chart-empty">Noch keine Daten</div>';
 const data=[...rows].sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-20),values=data.map(x=>num(x.value)),lo=Math.min(...values),hi=Math.max(...values),rawSpan=Math.max(.1,hi-lo),pad=Math.max(rawSpan*.28,.6),min=Math.max(0,lo-pad),max=hi+pad,span=Math.max(.1,max-min);
 const W=390,H=255,L=66,R=18,T=28,B=58,plotW=W-L-R,plotH=H-T-B,x=i=>L+i*plotW/Math.max(1,data.length-1),y=v=>T+(max-v)/span*plotH;
 let grid='';for(let i=0;i<5;i++){const yy=T+i*plotH/4,v=max-i*span/4;grid+=`<line class="grid" x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}"/><text class="y" x="${L-9}" y="${yy+4}" text-anchor="end">${val(v)}</text>`}
 const path=data.map((p,i)=>`${x(i)},${y(num(p.value))}`).join(' '),points=data.map((p,i)=>`<circle cx="${x(i)}" cy="${y(num(p.value))}" r="5"/><text class="point" x="${x(i)}" y="${Math.max(14,y(num(p.value))-11)}" text-anchor="middle">${val(p.value)}</text>`).join(''),every=Math.max(1,Math.ceil(data.length/5)),labels=data.map((p,i)=>i%every===0||i===data.length-1?`<text class="x" x="${x(i)}" y="${H-22}" text-anchor="middle">${shortDate(p.date)}</text>`:'').join('');
 return`<svg class="clean-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Umfangsverlauf"><text class="axis-title-y" x="14" y="${T+plotH/2}" transform="rotate(-90 14 ${T+plotH/2})" text-anchor="middle">cm</text><text class="axis-title-x" x="${L+plotW/2}" y="${H-4}" text-anchor="middle">Datum</text>${grid}<line class="axis" x1="${L}" y1="${T}" x2="${L}" y2="${H-B}"/><line class="axis" x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}"/><polyline points="${path}"/>${points}${labels}</svg>`;
}
function card(title,rows){return`<article class="chart-card card measurement-chart-card"><h3>${title}</h3><div>${chart(rows)}</div></article>`}
function render(){
 const measurements=read(SNAP,{measurements:[]}).measurements||[];
 const waist=measurement(measurements,'waist_cm');if(q('#waist-chart'))q('#waist-chart').innerHTML=chart(waist);if(q('#waist-chart-2'))q('#waist-chart-2').innerHTML=chart(waist);
 const measurementPage=q('#page-measurements'),progressPage=q('#page-progress');
 if(measurementPage){qa('.measurement-extra',measurementPage).forEach(x=>x.remove());const anchor=q('#waist-chart')?.closest('.chart-card');for(const [title,key] of DEFINITIONS.slice(1)){const data=measurement(measurements,key);const wrap=document.createElement('div');wrap.className='measurement-extra';wrap.innerHTML=card(title,data);(anchor?.parentElement||measurementPage).append(wrap)}}
 if(progressPage){qa('.measurement-extra',progressPage).forEach(x=>x.remove());const holder=document.createElement('section');holder.className='measurement-extra measurement-overview';holder.innerHTML=`<div class="measurement-overview-head"><h2>Körperumfänge</h2><p>Alle gespeicherten Umfangsverläufe.</p></div><div class="measurement-grid-charts">${DEFINITIONS.map(([title,key])=>card(title,measurement(measurements,key))).join('')}</div>`;progressPage.append(holder)}
}
function style(){if(q('#clean-progress-style'))return;const s=document.createElement('style');s.id='clean-progress-style';s.textContent='.clean-chart{display:block;width:100%;height:auto;overflow:visible}.clean-chart .grid{stroke:var(--line,#e2e8e2);stroke-width:1}.clean-chart .axis{stroke:var(--muted,#778279);stroke-width:1.3}.clean-chart polyline{fill:none;stroke:#356b4d;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}.clean-chart circle{fill:#356b4d;stroke:var(--surface,#fff);stroke-width:2}.clean-chart text{font-family:inherit}.clean-chart .x,.clean-chart .y,.clean-chart .axis-title-x,.clean-chart .axis-title-y{fill:var(--muted,#707a72);font-size:10px}.clean-chart .axis-title-x,.clean-chart .axis-title-y{font-weight:800}.clean-chart .point{fill:var(--text,#244f38);font-size:10px;font-weight:800}.clean-chart-empty{display:grid;place-items:center;min-height:150px;color:var(--muted,#737973)}.measurement-overview{margin-top:18px}.measurement-overview-head{margin:0 4px 12px}.measurement-overview-head h2{margin:0 0 4px}.measurement-overview-head p{margin:0;color:var(--muted)}.measurement-grid-charts{display:grid;grid-template-columns:1fr 1fr;gap:12px}.measurement-chart-card{min-width:0}.measurement-chart-card h3{margin-bottom:8px}@media(max-width:680px){.measurement-grid-charts{grid-template-columns:1fr}}';document.head.append(s)}
function install(){style();render();document.addEventListener('click',e=>{if(e.target.closest('[data-page="progress"],[data-page="measurements"],#save-measurement))setTimeout(render,100)},true);window.addEventListener('gym:schedule-refresh',()=>setTimeout(render,100))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
