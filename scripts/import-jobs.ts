import { createClient } from '@supabase/supabase-js';
import { fetchBoard, type Source } from '../src/lib/jobs/connectors';
async function main() {
const [source,board,...companyParts]=process.argv.slice(2);
const company=companyParts.join(' ');
if(!['greenhouse','lever','lever_eu','ashby','smartrecruiters'].includes(source)||!board||!company) throw new Error('Usage: npm run import-jobs -- <greenhouse|lever|lever_eu|ashby|smartrecruiters> <board> <company name>');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the shell. Never expose the service role key to the browser.');
const db=createClient(url,key,{auth:{persistSession:false}});
const jobs=await fetchBoard(source as Source,board,company);
for(let i=0;i<jobs.length;i+=100){const {error}=await db.from('jobs').upsert(jobs.slice(i,i+100),{onConflict:'source,source_id'}); if(error) throw new Error(`Import failed: ${error.message}`);}
console.log(`Imported/updated ${jobs.length} listings from ${source}. No expiration was performed.`);

}
main().catch(error=>{ console.error(error instanceof Error ? error.message : 'Import failed'); process.exitCode=1; });
