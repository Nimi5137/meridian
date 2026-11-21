import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {configuredPrices} from './config';
import {hasPaidAiEntitlement} from './entitlements';
export async function hasAiAccess(db:SupabaseClient,userId:string):Promise<boolean> {if(process.env.BILLING_ENFORCE_AI!=='true')return true;const prices=configuredPrices().map(p=>p.id);if(!prices.length)return false;const {data,error}=await db.from('billing_subscriptions').select('status,price_id').eq('user_id',userId);return !error&&hasPaidAiEntitlement(data||[],prices);}
