'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {parseInterview} from '@/lib/interviews/validation';
const uuid=z.string().uuid();
function destination(value:FormDataEntryValue|null){const id=uuid.safeParse(value);if(!id.success)redirect('/applications?error=Invalid%20application');return `/applications/${id.data}`;}
export async function saveInterview(form:FormData){
 const {db,user}=await requireUser(), back=destination(form.get('application_id'));
 const parsed=parseInterview({title:form.get('title'),localTime:form.get('local_time'),timezone:form.get('timezone'),location:form.get('location')||'',notes:form.get('notes')||''});
 const interviewId=form.get('interview_id');const version=form.get('version');
 if(!parsed||(interviewId!==null&&(!uuid.safeParse(interviewId).success||!uuid.safeParse(version).success)))redirect(`${back}?error=${encodeURIComponent('Invalid interview details. Check the timezone and time; daylight-saving gaps and ambiguous times are not accepted.')}`);
 const appId=back.slice('/applications/'.length);
 if(interviewId===null){const {error}=await db.from('interviews').insert({...parsed,user_id:user.id,application_id:appId});if(error)redirect(`${back}?error=Could%20not%20save%20the%20interview`);}
 else{const {data,error}=await db.from('interviews').update(parsed).eq('id',interviewId).eq('user_id',user.id).eq('application_id',appId).eq('version',version).select('id').maybeSingle();if(error||!data)redirect(`${back}?error=${encodeURIComponent('Interview changed or is unavailable. Reload before editing again.')}`);}
 revalidatePath(back);redirect(`${back}?interview=1`);
}
export async function deleteInterview(form:FormData){
 const {db,user}=await requireUser(),back=destination(form.get('application_id'));const id=uuid.safeParse(form.get('interview_id')),version=uuid.safeParse(form.get('version'));
 if(!id.success||!version.success||form.get('confirm')!=='yes')redirect(`${back}?error=Confirm%20interview%20removal`);
 const {data,error}=await db.from('interviews').delete().eq('id',id.data).eq('user_id',user.id).eq('application_id',back.slice('/applications/'.length)).eq('version',version.data).select('id').maybeSingle();
 if(error||!data)redirect(`${back}?error=${encodeURIComponent('Interview changed or is unavailable. Reload before removing it.')}`);revalidatePath(back);redirect(`${back}?interview=1`);
}
