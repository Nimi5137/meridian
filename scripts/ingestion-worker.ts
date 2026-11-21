/** Run once from an external scheduler. No in-memory scheduling or credentials in clients. */
import {createClient} from '@supabase/supabase-js';
import {fetchBoard,type Source} from '../src/lib/jobs/connectors';
async function main() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) throw new Error('Missing server-side Supabase configuration');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const scheduled=await db.rpc('enqueue_due_boards');if(scheduled.error)throw new Error('Could not enqueue due boards');
 let failed=false;
 for(let i=0;i<10;i++){
  const claim=await db.rpc('claim_ingestion_task');if(claim.error)throw new Error('Could not claim a task');const task=claim.data?.[0];if(!task)break;
  try {const jobs=await fetchBoard(task.source as Source,task.board,task.company);
   for(let offset=0;offset<jobs.length;offset+=100){const result=await db.rpc('commit_ingestion_batch',{p_id:task.task_id,p_token:task.token,p_jobs:jobs.slice(offset,offset+100)});if(result.error)throw new Error('Batch commit failed or lease lost');}
   const finished=await db.rpc('finish_ingestion_task',{p_id:task.task_id,p_token:task.token,p_success:true,p_count:jobs.length,p_error:null});if(finished.error||!finished.data)throw new Error('Task lease lost before completion');console.log(`Ingestion task completed: ${jobs.length} records`);
  } catch {failed=true;const finished=await db.rpc('finish_ingestion_task',{p_id:task.task_id,p_token:task.token,p_success:false,p_count:0,p_error:'Provider or storage error'});if(finished.error||!finished.data)console.error('Task failure could not be recorded; lease recovery will retry');else console.error('Ingestion failed; retry or failure recorded');}
 }
 if(failed) process.exitCode=1;
}
main().catch(()=>{console.error('Worker could not complete');process.exitCode=1;});
