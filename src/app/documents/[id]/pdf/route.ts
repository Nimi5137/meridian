import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {makePdf,UnsupportedPdfText} from '@/lib/documents/pdf';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!z.string().uuid().safeParse(id).success)return new Response('Not found',{status:404,headers:{'Cache-Control':'private, no-store'}});
 const {db,user}=await requireUser();
 const {data,error}=await db.from('application_documents').select('kind,content').eq('id',id).eq('user_id',user.id).maybeSingle();
 if(error||!data)return new Response('Not found',{status:404,headers:{'Cache-Control':'private, no-store'}});
 try{
  const bytes=await makePdf(data.content);
  return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${data.kind==='cv'?'cv':'cover-letter'}.pdf"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(error){
  if(error instanceof UnsupportedPdfText)return new Response('PDF export supports Latin, Greek and Cyrillic text without control characters, up to 100 pages. Use DOCX or browser print for other text.',{status:422,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  return new Response('PDF export failed. Please try again.',{status:500,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
}
