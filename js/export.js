import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const q=(s,r=document)=>r.querySelector(s);
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};

function download(name,data,type='application/json'){
 const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
}
async function databaseData(kind){
 const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Bitte neu anmelden.');
 const out={exported_at:new Date().toISOString(),format_version:1};
 if(kind==='weights'||kind==='all'){const r=await supabase.from('weigh_ins').select('*').eq('user_id',session.user.id).order('measured_at');if(r.error)throw r.error;out.weights=r.data||[]}
 if(kind==='measurements'||kind==='all'){const r=await supabase.from('body_measurements').select('*').eq('user_id',session.user.id).order('measured_at');if(r.error)throw r.error;out.measurements=r.data||[]}
 if(kind==='studio'||kind==='all'){out.studios=read('gym-studio-profiles-v62',{});out.active_studio=read('gym-studio-profile-v35',read('gym-studio-profile-v32',null));out.studio_names=read('gym-studios-v62',['John Reed Essen']) }
 return out;
}
function ensureDialog(){let d=q('#data-export-dialog');if(d)return d;d=document.createElement('dialog');d.id='data-export-dialog';d.innerHTML=`<form method="dialog" class="export-card"><header><div><small>DATEN</small><h2>Export</h2></div><button type="button" data-export-close>Schließen</button></header><p>JSON erhält alle Felder vollständig und ist für eine spätere Auswertung in ChatGPT am geeignetsten.</p><label>Datensatz<select data-export-kind><option value="all">Alles</option><option value="weights">Gewicht</option><option value="measurements">Umfänge</option><option value="studio">Studio</option></select></label><p data-export-status></p><button type="button" class="primary" data-export-run>JSON exportieren</button></form>`;document.body.append(d);q('[data-export-close]',d).onclick=()=>d.close();q('[data-export-run]',d).onclick=runExport;return d}
async function runExport(){const d=ensureDialog(),status=q('[data-export-status]',d),kind=q('[data-export-kind]',d).value;status.textContent='Export wird erstellt …';try{const data=await databaseData(kind),stamp=new Intl.DateTimeFormat('en-CA').format(new Date());download(`gym-${kind}-${stamp}.json`,JSON.stringify(data,null,2));status.textContent='Export erstellt.'}catch(e){status.textContent=e.message}}
function install(){const card=q('#page-settings .settings-card');if(!card||q('#settings-export'))return;const row=document.createElement('div');row.className='settings-row';row.innerHTML='<span>Datenexport</span><button id="settings-export" class="secondary">Exportieren</button>';card.append(row);q('#settings-export').onclick=()=>ensureDialog().showModal();if(!q('#export-style')){const s=document.createElement('style');s.id='export-style';s.textContent='.export-card{padding:18px;min-width:min(88vw,440px);color:var(--text)}#data-export-dialog{border:0;border-radius:22px;background:var(--surface);color:var(--text)}#data-export-dialog::backdrop{background:rgba(18,24,20,.48);backdrop-filter:blur(4px)}.export-card header{display:flex;justify-content:space-between;gap:12px;align-items:center}.export-card header h2{margin:.2rem 0}.export-card label{display:grid;gap:6px;margin:14px 0;color:var(--muted)}.export-card select{min-height:46px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);color:inherit;padding:0 10px;font-size:16px}.export-card>.primary{width:100%;min-height:48px}';document.head.append(s)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
