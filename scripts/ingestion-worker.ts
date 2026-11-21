/** Run once from an external scheduler. No in-memory scheduling or credentials in clients. */
import {createClient} from '@supabase/supabase-js';
import {runIngestion} from '../src/lib/jobs/worker';
async function main() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('Missing server-side Supabase configuration');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const result=await runIngestion(db);
 console.log(`Ingestion finished: ${result.processed} tasks, ${result.imported} records, ${result.failed} failed`);
 if(result.failed)process.exitCode=1;
}
main().catch(()=>{console.error('Worker could not complete');process.exitCode=1;});
