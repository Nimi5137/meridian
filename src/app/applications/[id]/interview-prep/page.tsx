import Link from 'next/link';
import {notFound} from 'next/navigation';
import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {Shell} from '@/components/Shell';
import {PreparationNotes} from './PreparationNotes';

export default async function InterviewPreparation({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();
 const {db,user}=await requireUser();
 const application=await db.from('applications').select('id,jobs(title,company)').eq('id',id).eq('user_id',user.id).maybeSingle();
 if(application.error)return <Shell active="/applications" email={user.email||''}><div className="alert error">Could not load this application. Please try again.</div><Link href="/applications">Back to applications</Link></Shell>;
 if(!application.data)notFound();
 const entries=await db.from('career_entries').select('id,title,organization,kind').eq('user_id',user.id).order('start_date',{ascending:false,nullsFirst:false}).order('id',{ascending:false}).limit(20);
 const job=Array.isArray(application.data.jobs)?application.data.jobs[0]:application.data.jobs;
 const role=job?.title||'Saved opportunity',company=job?.company||'Employer unavailable';
 return <Shell active="/applications" email={user.email||''}>
  <div className="topline">YOUR WORKSPACE <span className="slash">/</span> INTERVIEW PREPARATION</div>
  <div className="page-heading"><div className="eyebrow"><span className="eyebrow-dot"/> PLAN YOUR CONVERSATION</div><h1>Prepare for your interview<span>.</span></h1><p>{role} · {company}</p></div>
  <Link href={`/applications/${id}`} className="back-link">← Back to application</Link>
  <PreparationNotes role={role} company={company}/>
  <section className="panel form-section"><div className="overline">YOUR SAVED BACKGROUND</div><h3>Possible stories to revisit</h3><p>These are your saved career entries, not suggested claims or verified facts. Choose only examples you can accurately explain.</p>
   {entries.error?<div className="alert error">Could not load career entries.</div>:entries.data?.length?<ul>{entries.data.map(entry=><li key={entry.id}><Link href={`/profile/entries/${entry.id}`}>{entry.title}</Link>{entry.organization?` · ${entry.organization}`:''} <small>({entry.kind})</small></li>)}</ul>:<p>No career entries saved yet. You can prepare without one, or <Link href="/profile/entries/new">add an entry</Link>.</p>}
   <p className="disclaimer">Up to 20 entries are shown. Opening a link leaves this page; download any notes first.</p>
  </section>
 </Shell>;
}
