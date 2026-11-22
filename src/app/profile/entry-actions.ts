'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {careerEntrySchema,careerEntryVersion,type CareerEntryFormState} from '@/lib/cv/career-entry';
const uuid=z.string().uuid();
export async function saveCareerEntry(_previous:CareerEntryFormState,form:FormData):Promise<CareerEntryFormState> {
 const {db,user}=await requireUser();
 const raw=Object.fromEntries(['kind','title','organization','start_date','end_date','description'].map(k=>[k,String(form.get(k)||'')]));
 const parsed=careerEntrySchema.safeParse(raw);const id=String(form.get('id')||'');
 if(id&&!uuid.safeParse(id).success)return {kind:'error',message:'Invalid entry.'};
 const version=id?careerEntryVersion(form.get('version')):null;
 if(!parsed.success)return {kind:'error',message:'Check your entry and dates.'};
 if(id&&!version)return {kind:'conflict',message:'Entry version is missing or invalid. Copy your edits, then reload.'};
 const entry={...parsed.data,start_date:parsed.data.start_date||null,end_date:parsed.data.end_date||null};
 if(id&&version){
  const result=await db.rpc('update_career_entry_if_unchanged',{p_id:id,p_expected:version,p_kind:entry.kind,p_title:entry.title,p_organization:entry.organization,p_start_date:entry.start_date,p_end_date:entry.end_date,p_description:entry.description});
  if(result.error||result.data==='invalid')return {kind:'error',message:'Could not save entry. Your edits remain in the form.'};
  if(result.data!=='updated')return {kind:'conflict',message:'Entry changed or is unavailable. Your edits remain below; copy them, then reload to review the current entry.'};
 }else{
  const result=await db.from('career_entries').insert({...entry,user_id:user.id}).select('id').single();
  if(result.error||!result.data)return {kind:'error',message:'Could not save entry. Your edits remain in the form.'};
 }
 revalidatePath('/profile');redirect('/profile?saved=1');
}
export async function deleteCareerEntry(form:FormData){
 const {db}=await requireUser();const id=uuid.safeParse(form.get('id'));const version=careerEntryVersion(form.get('version'));
 if(!id.success||!version)redirect('/profile?error=Invalid%20entry%20or%20version');
 const {data,error}=await db.rpc('delete_career_entry_if_unchanged',{p_id:id.data,p_expected:version});
 if(error||data==='invalid')redirect('/profile?error=Could%20not%20delete%20entry');
 if(data!=='deleted')redirect(`/profile/entries/${id.data}?error=${encodeURIComponent('Entry changed or is unavailable. Reload before deleting.')}`);
 revalidatePath('/profile');redirect('/profile?saved=1');
}
