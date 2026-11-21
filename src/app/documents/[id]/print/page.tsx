import Link from 'next/link';
import {notFound} from 'next/navigation';
import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {PrintButton} from './PrintButton';
export default async function PrintDocument({params}:{params:Promise<{id:string}>}) {const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();const {db,user}=await requireUser();const {data,error}=await db.from('application_documents').select('application_id,kind,content').eq('id',id).eq('user_id',user.id).maybeSingle();if(error||!data)notFound();return <main className="print-view"><div className="print-controls"><Link href={`/applications/${data.application_id}`}>← Back to application</Link><p>Use your browser’s print dialog and choose “Save as PDF” if available. Review the result before use.</p><PrintButton/></div><article className="print-document" aria-label={data.kind==='cv'?'CV':'Cover letter'}>{data.content.replace(/\r\n?/g,'\n').split('\n').map((line:string,i:number)=><p key={i} dir="auto">{line||'\u00a0'}</p>)}</article></main>}
