import {requireUser} from '@/lib/auth';
export const runtime='nodejs';
const PAGE_SIZE=50, MAX_ROWS=10000, MAX_BYTES=8*1024*1024;
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const tooLarge=()=>new Response('Export is too large for this endpoint; contact support.',{status:413,headers});
/** Bounded, keyset-paginated JSON export. Not a transactional snapshot; original files are separate. */
export async function GET(){
 const {db,user}=await requireUser();
 const tables=['profiles','profile_field_sources','career_entries','original_cvs','profile_imports','job_matches','applications','application_events','interviews','application_documents','application_questions','application_approvals','manual_submissions','reusable_answers','ai_usage_observations','integration_connections','billing_subscriptions'] as const;
 const exported:Record<string,unknown>={};let totalRows=0,bytes=0;
 for(const table of tables){
  const rows:unknown[]=[];const key=table==='profiles'?'user_id':table==='profile_field_sources'?'field':table==='integration_connections'?'kind':table==='billing_subscriptions'?'stripe_subscription_id':'id';let cursor:string|undefined;
  for(;;){
   let query=db.from(table).select('*').eq('user_id',user.id).order(key,{ascending:true}).limit(PAGE_SIZE);if(cursor!==undefined)query=query.gt(key,cursor);
   const result=await query;
   if(result.error||!Array.isArray(result.data))return new Response('Export could not be completed. Please try again.',{status:500,headers});
   for(const row of result.data){
    if(++totalRows>MAX_ROWS)return tooLarge();
    bytes+=Buffer.byteLength(JSON.stringify(row),'utf8')+1;if(bytes>MAX_BYTES)return tooLarge();rows.push(row);
   }
   if(result.data.length<PAGE_SIZE)break;
   const last=result.data[result.data.length-1]?.[key];if(typeof last!=='string'||last===cursor)return new Response('Export could not be completed. Please try again.',{status:500,headers});cursor=last;
  }
  exported[table]=rows;
 }
 const content=JSON.stringify({exported_at:new Date().toISOString(),account:{id:user.id,email:user.email},note:'Original CV files are not embedded; download them separately from your profile. This export is not a transactional snapshot.',data:exported});
 if(Buffer.byteLength(content,'utf8')>MAX_BYTES)return tooLarge();
 return new Response(content,{headers:{...headers,'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="career-data.json"'}});
}
