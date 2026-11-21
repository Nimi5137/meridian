'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {careerEntrySchema} from '@/lib/cv/career-entry';
export async function saveCareerEntry(form:FormData) {
 const {db,user}=await requireUser();const raw=Object.fromEntries(['kind','title','organization','start_date','end_date','description'].map(k=>[k,String(form.get(k)||'')]));const parsed=careerEntrySchema.safeParse(raw);const id=String(form.get('id')||'');const back=id?`/profile/entries/${id}`:'/profile/entries/new';
 if(!parsed.success || (id&&!z.string().uuid().safeParse(id).success)) redirect(`${back}?error=Check%20your%20entry%20and%20dates`);
 const entry={...parsed.data,start_date:parsed.data.start_date||null,end_date:parsed.data.end_date||null,updated_at:new Date().toISOString()};
 const result=id?await db.from('career_entries').update(entry).eq('user_id',user.id).eq('id',id).select('id').maybeSingle():await db.from('career_entries').insert({...entry,user_id:user.id}).select('id').single();
 if(result.error||!result.data) redirect(`${back}?error=Could%20not%20save%20entry`);revalidatePath('/profile');redirect('/profile?saved=1');
}
export async function deleteCareerEntry(form:FormData){const {db,user}=await requireUser();const id=z.string().uuid().safeParse(form.get('id'));if(!id.success)redirect('/profile?error=Invalid%20entry');const {data,error}=await db.from('career_entries').delete().eq('id',id.data).eq('user_id',user.id).select('id').maybeSingle();if(error||!data)redirect('/profile?error=Could%20not%20delete%20entry');revalidatePath('/profile');redirect('/profile?saved=1');}
