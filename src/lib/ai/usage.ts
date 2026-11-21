import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Adapter,Provider,Task} from './service';
type UsageTask=Extract<Task,'extraction'|'matching'|'cv'|'cover_letter'>|'readiness';
type Configured={adapter:Adapter;provider:Provider;model:string};
const validTokens=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=100_000_000?value:null;
/** One quota reservation and one provider call. Records are observations, not billing-grade evidence. */
export async function trackedAdapter(db:SupabaseClient,task:UsageTask,configured:Configured):Promise<Adapter> {
 const started=await db.rpc('begin_ai_usage',{p_task:task,p_provider:configured.provider,p_model:configured.model});
 if(started.error||typeof started.data!=='string')throw new Error('AI request limit reached or usage tracking unavailable');
 const id=started.data;let used=false;
 async function finish(success:boolean,input:unknown,output:unknown){try{const result=await db.rpc('finish_ai_usage',{p_id:id,p_success:success,p_input:success?validTokens(input):null,p_output:success?validTokens(output):null});if(result.error||result.data!==true)console.error('AI usage completion could not be recorded');}catch{console.error('AI usage completion could not be recorded');}}
 return {capabilities:configured.adapter.capabilities,async generate(request){if(used)throw new Error('AI usage reservation already used');used=true;let result;try{result=await configured.adapter.generate(request);}catch(error){await finish(false,null,null);throw error;}await finish(true,result.inputTokens,result.outputTokens);return result;}};
}
