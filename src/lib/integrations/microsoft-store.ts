import 'server-only';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {adminClient} from '@/lib/supabase/admin';
import {seal,unseal} from './crypto';
import {refreshMicrosoftTokens,type MicrosoftKind} from './microsoft';
import type {Tokens} from './google';
const tokenSchema=z.object({accessToken:z.string().min(1).max(8192),refreshToken:z.string().min(1).max(8192),expiresAt:z.string().datetime()});
export const microsoftTokenContext=(userId:string,kind:MicrosoftKind)=>`microsoft-token:${userId}:${kind}`;
export const microsoftStateContext=(userId:string,hash:string)=>`microsoft-state:${userId}:${hash}`;
export function encodeMicrosoftTokens(tokens:Tokens,userId:string,kind:MicrosoftKind){return seal(JSON.stringify(tokens),microsoftTokenContext(userId,kind));}
function decode(ciphertext:string,userId:string,kind:MicrosoftKind){return tokenSchema.parse(JSON.parse(unseal(ciphertext,microsoftTokenContext(userId,kind))));}
async function readSecret(userId:string,kind:MicrosoftKind){const {data,error}=await adminClient().from('integration_secrets').select('ciphertext,access_expires_at').eq('user_id',userId).eq('kind',kind).maybeSingle();if(error||!data)throw new Error('Connection unavailable');return data;}
export async function microsoftAccessToken(userId:string,kind:MicrosoftKind):Promise<string>{const initial=await readSecret(userId,kind);if(Date.parse(initial.access_expires_at)>Date.now()+60000)return decode(initial.ciphertext,userId,kind).accessToken;const db=adminClient(),lease=randomUUID();const claimed=await db.rpc('claim_integration_refresh',{p_user:userId,p_kind:kind,p_lease:lease});if(claimed.error)throw new Error('Refresh unavailable');if(!claimed.data){const latest=await readSecret(userId,kind);if(Date.parse(latest.access_expires_at)>Date.now()+60000)return decode(latest.ciphertext,userId,kind).accessToken;throw new Error('Refresh already in progress');}const previous=decode(claimed.data.ciphertext,userId,kind);const updated=await refreshMicrosoftTokens(kind,previous.refreshToken);const saved=await db.rpc('finish_integration_refresh',{p_user:userId,p_kind:kind,p_lease:lease,p_ciphertext:encodeMicrosoftTokens(updated,userId,kind),p_expires:updated.expiresAt});if(saved.error||!saved.data)throw new Error('Refresh lease lost');return updated.accessToken;}
