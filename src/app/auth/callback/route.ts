import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {appOrigin} from '@/lib/billing/config';
export const dynamic='force-dynamic';
function redirectTo(path:string,origin:string){const response=NextResponse.redirect(new URL(path,origin),303);response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;}
export async function GET(request:Request){
 let origin:string;try{origin=appOrigin();}catch{return new NextResponse('Authentication unavailable',{status:503,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}
 const url=new URL(request.url),code=url.searchParams.get('code');
 // Password recovery is the only supported alternate destination. Never trust a URL or Host header from a request.
 const next=url.searchParams.get('next')==='/settings'?'/settings':'/dashboard';
 if(code&&code.length<=4096){try{const db=await createClient();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return redirectTo(next,origin);}catch{/* Use the same generic failure for expired and unavailable sessions. */}}
 return redirectTo('/login?error=Authentication%20link%20expired%20or%20invalid',origin);
}
