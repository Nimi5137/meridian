import 'server-only';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {adminClient} from '@/lib/supabase/admin';
import {seal,unseal} from './crypto';
import {refreshTokens,type GoogleKind,type Tokens} from './google';
const tokenSchema=z.object({accessToken:z.string().min(1).max(8192),refreshToken:z.string().min(1).max(8192),expiresAt:z.string().datetime()});
export const tokenContext=(userId:string,kind:GoogleKind)=>`google-token:${userId}:${kind}`;
export const stateContext=(userId:string,hash:string)=>`google-state:${userId}:${hash}`;
export function encodeTokens(tokens:Tokens,userId:string,kind:GoogleKind){return seal(JSON.stringify(tokens),tokenContext(userId,kind));}
function decodeTokens(ciphertext:string,userId:string,kind:GoogleKind){return tokenSchema.parse(JSON.parse(unseal(ciphertext,tokenContext(userId,kind))));}
async function readSecret(userId:string,kind:GoogleKind){const {data,error}=await adminClient().from('integration_secrets').select('ciphertext,access_expires_at').eq('user_id',userId).eq('kind',kind).maybeSingle();if(error||!data)throw new Error('Connection unavailable');return data;}
export async function googleAccessToken(userId:string,kind:GoogleKind):Promise<string>{const initial=await readSecret(userId,kind);if(Date.parse(initial.access_expires_at)>Date.now()+60000)return decodeTokens(initial.ciphertext,userId,kind).accessToken;
 const db=adminClient(),lease=randomUUID();const claimed=await db.rpc('claim_integration_refresh',{p_user:userId,p_kind:kind,p_lease:lease});if(claimed.error)throw new Error('Refresh unavailable');if(!claimed.data){const latest=await readSecret(userId,kind);if(Date.parse(latest.access_expires_at)>Date.now()+60000)return decodeTokens(latest.ciphertext,userId,kind).accessToken;throw new Error('Refresh already in progress');}
 const previous=decodeTokens(claimed.data.ciphertext,userId,kind);const updated=await refreshTokens(previous.refreshToken);const saved=await db.rpc('finish_integration_refresh',{p_user:userId,p_kind:kind,p_lease:lease,p_ciphertext:encodeTokens(updated,userId,kind),p_expires:updated.expiresAt});if(saved.error||!saved.data)throw new Error('Refresh lease lost');return updated.accessToken;}
