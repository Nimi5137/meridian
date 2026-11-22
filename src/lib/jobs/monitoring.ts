import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';

export type IngestionHealth={enabledBoards:number|null;overdueBoards:number|null;overdueQueued:number|null;expiredLeases:number|null;failedLastDay:number|null;staleListings:number|null};
/** Read-only point-in-time indicators, not proof of scheduler or source health. */
export async function ingestionHealth(db:SupabaseClient,now=new Date()):Promise<IngestionHealth>{
 const iso=(ms:number)=>new Date(now.getTime()-ms).toISOString();
 const nowIso=now.toISOString(), halfHour=iso(30*60_000),day=iso(24*60*60_000),week=iso(7*24*60*60_000);
 const queries=[
  db.from('job_boards').select('id',{count:'exact',head:true}).eq('enabled',true),
  db.from('job_boards').select('id',{count:'exact',head:true}).eq('enabled',true).lt('next_run_at',halfHour),
  db.from('ingestion_tasks').select('id',{count:'exact',head:true}).eq('status','queued').lt('available_at',halfHour),
  db.from('ingestion_tasks').select('id',{count:'exact',head:true}).eq('status','running').lt('lease_until',nowIso),
  db.from('ingestion_tasks').select('id',{count:'exact',head:true}).eq('status','failed').gte('finished_at',day),
  db.from('jobs').select('id',{count:'exact',head:true}).eq('active',true).or(`last_verified_at.is.null,last_verified_at.lt.${week}`),
 ];
 const results=await Promise.all(queries);
 const counts=results.map(result=>!result.error&&typeof result.count==='number'?result.count:null);
 return {enabledBoards:counts[0],overdueBoards:counts[1],overdueQueued:counts[2],expiredLeases:counts[3],failedLastDay:counts[4],staleListings:counts[5]};
}
