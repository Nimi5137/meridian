import {describe,it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {runIngestion} from '../src/lib/jobs/worker';
import type {NormalizedJob} from '../src/lib/jobs/connectors';
const task={task_id:'5bca9447-210f-4c10-90a5-e77b862651a0',token:'5bca9447-210f-4c10-90a5-e77b862651a1',source:'greenhouse',board:'board',company:'Synthetic company'};
function job(i:number):NormalizedJob{return {source:'greenhouse',source_id:`board:${i}`,title:'Synthetic role',company:'Synthetic company',location:'',description:'',listing_url:'https://example.org/job',published_at:null,last_verified_at:'2026-01-01T00:00:00Z',active:true};}
function client(claims:unknown[]=[task]){
 let index=0;const rpc=vi.fn(async(name:string,args?:Record<string,unknown>)=>{
  if(name==='enqueue_due_boards')return {data:1,error:null};
  if(name==='claim_ingestion_task')return {data:index<claims.length?[claims[index++]]:[],error:null};
  if(name==='commit_ingestion_batch')return {data:(args?.p_jobs as unknown[]).length,error:null};
  if(name==='finish_ingestion_task')return {data:true,error:null};
  throw new Error('unexpected RPC');
 });return {rpc,db:{rpc} as unknown as SupabaseClient};
}
describe('bounded ingestion worker',()=>{
 it('commits batches under the lease and completes only after all writes',async()=>{const {db,rpc}=client();const fetcher=vi.fn().mockResolvedValue(Array.from({length:101},(_,i)=>job(i)));expect(await runIngestion(db,fetcher)).toEqual({processed:1,failed:0,imported:101});expect(fetcher).toHaveBeenCalledWith('greenhouse','board','Synthetic company');const batches=rpc.mock.calls.filter(([name])=>name==='commit_ingestion_batch');expect(batches.map(([,args])=>(args?.p_jobs as unknown[]).length)).toEqual([100,1]);for(const [,args] of batches)expect(args).toMatchObject({p_id:task.task_id,p_token:task.token});expect(rpc).toHaveBeenCalledWith('finish_ingestion_task',expect.objectContaining({p_success:true,p_count:101}));});
 it('records a failed task rather than completing a partial or mismatched batch',async()=>{const {db,rpc}=client();const fallback=rpc.getMockImplementation()!;rpc.mockImplementation(async(name,args)=>name==='commit_ingestion_batch'?{data:0,error:null}:fallback(name,args));const result=await runIngestion(db,vi.fn().mockResolvedValue([job(1)]));expect(result).toEqual({processed:1,failed:1,imported:0});expect(rpc).toHaveBeenCalledWith('finish_ingestion_task',expect.objectContaining({p_success:false,p_count:0}));expect(rpc).not.toHaveBeenCalledWith('finish_ingestion_task',expect.objectContaining({p_success:true}));});
 it('handles provider errors without recording their private details and proceeds to another task',async()=>{const {db,rpc}=client([task,{...task,task_id:'5bca9447-210f-4c10-90a5-e77b862651a2'}]);const fetcher=vi.fn().mockRejectedValueOnce(new Error('private provider response')).mockResolvedValueOnce([job(1)]);expect(await runIngestion(db,fetcher)).toEqual({processed:2,failed:1,imported:1});expect(JSON.stringify(rpc.mock.calls)).not.toContain('private provider response');});
 it('reports a lost completion lease as failure',async()=>{const {db,rpc}=client();const fallback=rpc.getMockImplementation()!;rpc.mockImplementation(async(name,args)=>name==='finish_ingestion_task'&&args?.p_success===true?{data:false,error:null}:fallback(name,args));expect(await runIngestion(db,vi.fn().mockResolvedValue([]))).toEqual({processed:1,failed:1,imported:0});expect(rpc).toHaveBeenCalledWith('finish_ingestion_task',expect.objectContaining({p_success:false}));});
 it('rejects malformed claims before using their source or lease',async()=>{const {db,rpc}=client([{...task,source:'unknown'}]);const fetcher=vi.fn();await expect(runIngestion(db,fetcher)).rejects.toThrow('Invalid task claim');expect(fetcher).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalledWith('finish_ingestion_task',expect.anything());});
 it('stops after at most ten claims',async()=>{const {db,rpc}=client(Array.from({length:12},(_,i)=>({...task,board:`board${i}`})));const fetcher=vi.fn().mockResolvedValue([]);expect(await runIngestion(db,fetcher)).toEqual({processed:10,failed:0,imported:0});expect(fetcher).toHaveBeenCalledTimes(10);expect(rpc.mock.calls.filter(([name])=>name==='claim_ingestion_task')).toHaveLength(10);});
});
