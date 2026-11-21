import Link from 'next/link';
import {notFound} from 'next/navigation';
import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {Shell} from '@/components/Shell';
import {deleteCareerEntry} from '../../entry-actions';
import {CareerEntryForm} from './CareerEntryForm';
export default async function CareerEntry({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{error?:string}>}) {
 const {id}=await params;if(id!=='new'&&!z.string().uuid().safeParse(id).success)notFound();const {db,user}=await requireUser();const result=id==='new'?null:await db.from('career_entries').select('*').eq('id',id).eq('user_id',user.id).maybeSingle();if(result&&!result.data)notFound();const entry=result?.data;const p=await searchParams;
 return <Shell active="/profile" email={user.email||''}><div className="topline">YOUR WORKSPACE <span className="slash">/</span> CAREER ENTRY</div><div className="page-heading"><div className="eyebrow"><span className="eyebrow-dot"/> YOUR STORY, IN DETAIL</div><h1>{entry?'Edit your entry':'Add to your story'}<span>.</span></h1><p>Include experience, education, projects, or anything else that reflects your journey.</p></div><Link href="/profile" className="back-link">← Back to profile</Link>{p.error&&<div className="alert error">{p.error}</div>}<section className="panel form-section entry-form"><CareerEntryForm id={entry?.id||''} version={entry?.updated_at||''} initial={{kind:entry?.kind||'experience',title:entry?.title||'',organization:entry?.organization||'',start_date:entry?.start_date||'',end_date:entry?.end_date||'',description:entry?.description||''}}/>{entry&&<form action={deleteCareerEntry} className="delete-entry"><input type="hidden" name="id" value={entry.id}/><input type="hidden" name="version" value={entry.updated_at}/><button className="plain-button">Delete this entry</button></form>}</section></Shell>;
}
