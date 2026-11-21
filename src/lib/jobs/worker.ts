/** Bounded worker logic. The caller supplies a privileged server-only client. */
import type {SupabaseClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {fetchBoard} from './connectors';

const claimSchema=z.object({
 task_id:z.string().uuid(),token:z.string().uuid(),
 source:z.enum(['greenhouse','lever','lever_eu','ashby','smartrecruiters']),
 board:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
 company:z.string().min(1).max(200).refine(value=>!!value.trim()),
});

/**
 * Run at most ten claims. Partial batches may already be committed on failure;
 * lease-fenced idempotent upserts make a subsequent retry safe. A successful
 * fetch is not enough: every batch and the final lease transition must succeed.
 */
export async function runIngestion(db:SupabaseClient,fetchListings:typeof fetchBoard=fetchBoard):Promise<{processed:number;failed:number;imported:number}> {
 const scheduled=await db.rpc('enqueue_due_boards');if(scheduled.error)throw new Error('Could not enqueue due boards');
 let processed=0,failed=0,imported=0;
 for(let i=0;i<10;i++){
  const claim=await db.rpc('claim_ingestion_task');if(claim.error)throw new Error('Could not claim a task');
  if(!Array.isArray(claim.data))throw new Error('Invalid task claim response');
  if(claim.data.length===0)break;
  if(claim.data.length!==1)throw new Error('Invalid task claim response');
  const parsed=claimSchema.safeParse(claim.data[0]);if(!parsed.success)throw new Error('Invalid task claim response');
  const task=parsed.data;processed++;
  try {
   const jobs=await fetchListings(task.source,task.board,task.company);
   for(let offset=0;offset<jobs.length;offset+=100){
    const batch=jobs.slice(offset,offset+100);const result=await db.rpc('commit_ingestion_batch',{p_id:task.task_id,p_token:task.token,p_jobs:batch});
    if(result.error||result.data!==batch.length)throw new Error('Batch commit failed or lease lost');
   }
   const finished=await db.rpc('finish_ingestion_task',{p_id:task.task_id,p_token:task.token,p_success:true,p_count:jobs.length,p_error:null});
   if(finished.error||finished.data!==true)throw new Error('Task lease lost before completion');
   imported+=jobs.length;
  } catch {
   failed++;
   try {
    const finished=await db.rpc('finish_ingestion_task',{p_id:task.task_id,p_token:task.token,p_success:false,p_count:0,p_error:'Provider or storage error'});
    if(finished.error||finished.data!==true)console.error('Task failure could not be recorded; lease recovery will retry');
   } catch {console.error('Task failure could not be recorded; lease recovery will retry');}
  }
 }
 return {processed,failed,imported};
}
