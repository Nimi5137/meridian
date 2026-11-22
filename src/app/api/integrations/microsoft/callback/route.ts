import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {adminClient} from '@/lib/supabase/admin';
import {hashOAuthValue} from '@/lib/integrations/google';
import {exchangeMicrosoftCode,microsoftAccount,microsoftKinds} from '@/lib/integrations/microsoft';
import {unseal} from '@/lib/integrations/crypto';
import {appOrigin} from '@/lib/billing/config';
import {encodeMicrosoftTokens,microsoftStateContext} from '@/lib/integrations/microsoft-store';
export const runtime='nodejs';export const dynamic='force-dynamic';
function result(status:'connected'|'error'){let url:URL;try{url=new URL('/settings/integrations',appOrigin());}catch{return new NextResponse('Integration unavailable',{status:503,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}url.searchParams.set(status,status==='connected'?'1':'Microsoft authorization failed or expired. Please try again.');const response=NextResponse.redirect(url,303);response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;}
export async function GET(request:Request){const url=new URL(request.url),state=url.searchParams.get('state')||'',code=url.searchParams.get('code')||'';const store=await cookies(),cookie=store.get('microsoft_oauth_state')?.value||'';store.set('microsoft_oauth_state','',{httpOnly:true,sameSite:'lax',path:'/api/integrations/microsoft/callback',maxAge:0});if(!/^[A-Za-z0-9_-]{43}$/.test(state)||!/^[A-Za-z0-9_-]{43}$/.test(cookie)||cookie.length!==state.length||!timingSafeEqual(Buffer.from(cookie),Buffer.from(state))||!code||code.length>4096)return result('error');
 try{const auth=await createClient();const {data:{user},error}=await auth.auth.getUser();if(error||!user)return result('error');const hash=hashOAuthValue(state),db=adminClient();const claimed=await db.rpc('claim_integration_oauth',{p_user:user.id,p_hash:hash});const parsed=z.object({kind:z.enum(microsoftKinds),verifier:z.string().max(1024)}).safeParse(claimed.data);if(claimed.error||!parsed.success)return result('error');const verifier=unseal(parsed.data.verifier,microsoftStateContext(user.id,hash));if(!/^[A-Za-z0-9_-]{43}$/.test(verifier))return result('error');const tokens=await exchangeMicrosoftCode(parsed.data.kind,code,verifier);const email=await microsoftAccount(tokens.accessToken);const completed=await db.rpc('finish_integration_oauth',{p_user:user.id,p_kind:parsed.data.kind,p_hash:hash,p_email:email,p_ciphertext:encodeMicrosoftTokens(tokens,user.id,parsed.data.kind),p_expires:tokens.expiresAt});if(completed.error||!completed.data)return result('error');return result('connected');}catch{return result('error');}}
