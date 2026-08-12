import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const SNAP='gym-snapshot-v11';
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

async function query(label,fn,fallback){
  try{
    const result=await fn();
    if(result?.error)throw result.error;
    return result?.data??fallback;
  }catch(error){
    console.error(`[GYM] ${label} failed`,error);
    return fallback;
  }
}

async function hydrate(){
  const {data:{session},error:sessionError}=await supabase.auth.getSession();
  if(sessionError||!session)return;
  const userId=session.user.id;
  const previous=read(SNAP,{plan:{},workouts:{},schedule:[],completed:[],weights:[],measurements:[]});

  let plan=null;
  const planState=await query('plan state',()=>supabase.from('user_plan_state').select('active_plan_id').eq('user_id',userId).maybeSingle(),null);
  if(planState?.active_plan_id){
    plan=await query('active plan by state',()=>supabase.from('training_plans').select('*').eq('user_id',userId).eq('id',planState.active_plan_id).maybeSingle(),null);
  }
  if(!plan){
    const plans=await query('active plan fallback',()=>supabase.from('training_plans').select('*').eq('user_id',userId).eq('is_active',true).order('version',{ascending:false}).limit(1),[]);
    plan=plans?.[0]||null;
  }

  let workouts=previous.workouts||{};
  if(plan?.id){
    const planWorkouts=await query('plan workouts',()=>supabase.from('plan_workouts').select('*').eq('user_id',userId).eq('plan_id',plan.id).order('sequence_position'),[]);
    const workoutIds=planWorkouts.map(row=>row.id);
    const planExercises=workoutIds.length?await query('plan exercises',()=>supabase.from('plan_exercises').select('*').eq('user_id',userId).in('plan_workout_id',workoutIds).order('exercise_order'),[]):[];
    const exerciseIds=[...new Set(planExercises.map(row=>row.exercise_id).filter(Boolean))];
    const exercises=exerciseIds.length?await query('exercise catalogue',()=>supabase.from('exercises').select('id,name,image_path').in('id',exerciseIds),[]):[];
    const exerciseMap=Object.fromEntries(exercises.map(row=>[row.id,row]));
    workouts={};
    for(const row of planWorkouts){
      workouts[row.code]={...row,exercises:planExercises.filter(ex=>ex.plan_workout_id===row.id).map(ex=>({...ex,name:exerciseMap[ex.exercise_id]?.name||'Übung',image_path:exerciseMap[ex.exercise_id]?.image_path||null}))};
    }
  }

  const scheduleRows=await query('schedule',()=>supabase.from('scheduled_workouts').select('*').eq('user_id',userId).order('scheduled_date'),previous.schedule||[]);
  const completedRows=await query('completed workouts',()=>supabase.from('workouts').select('*').eq('user_id',userId).in('status',['completed','partial']).order('workout_date'),previous.completed||[]);
  const weights=await query('weigh ins',()=>supabase.from('weigh_ins').select('*').eq('user_id',userId).order('measured_at'),previous.weights||[]);
  const measurements=await query('body measurements',()=>supabase.from('body_measurements').select('*').eq('user_id',userId).order('measured_at'),previous.measurements||[]);

  const codeById=Object.fromEntries(Object.values(workouts).map(row=>[row.id,row.code]));
  const schedule=scheduleRows.map(row=>({...row,date:row.scheduled_date,code:codeById[row.plan_workout_id]||row.code||null}));
  const completed=completedRows.map(row=>({...row,date:row.workout_date,code:codeById[row.plan_workout_id]||row.code||null}));

  const next={
    plan:plan||previous.plan||{},
    workouts,
    schedule,
    completed,
    weights,
    measurements
  };
  write(SNAP,next);
  window.dispatchEvent(new CustomEvent('gym:snapshot-hydrated',{detail:{source:'supabase'}}));
  window.dispatchEvent(new Event('gym:schedule-refresh'));
  console.info('[GYM] resilient snapshot hydrated',{
    workouts:Object.keys(workouts).length,
    schedule:schedule.length,
    completed:completed.length,
    weights:weights.length,
    measurements:measurements.length
  });
}

hydrate().catch(error=>console.error('[GYM] snapshot hydration failed',error));
