import 'server-only';
import Stripe from 'stripe';
export const planKeys=['pro_monthly','pro_annual','premium_monthly','premium_annual','ultimate_monthly','ultimate_annual'] as const;
export type PlanKey=typeof planKeys[number];
const vars:Record<PlanKey,string>={pro_monthly:'STRIPE_PRO_MONTHLY_PRICE_ID',pro_annual:'STRIPE_PRO_ANNUAL_PRICE_ID',premium_monthly:'STRIPE_PREMIUM_MONTHLY_PRICE_ID',premium_annual:'STRIPE_PREMIUM_ANNUAL_PRICE_ID',ultimate_monthly:'STRIPE_ULTIMATE_MONTHLY_PRICE_ID',ultimate_annual:'STRIPE_ULTIMATE_ANNUAL_PRICE_ID'};
export function priceId(plan:PlanKey){return process.env[vars[plan]]||'';}
export function configuredPrices(){return planKeys.map(key=>({key,id:priceId(key)})).filter(plan=>!!plan.id);}
export function stripeClient(){const key=process.env.STRIPE_SECRET_KEY;if(!key)throw new Error('Stripe is not configured');return new Stripe(key,{timeout:30000,maxNetworkRetries:1});}
export function appOrigin(){const raw=process.env.NEXT_PUBLIC_APP_URL;if(!raw)throw new Error('Application URL not configured');const url=new URL(raw);if(url.protocol!=='https:' && !(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('Application URL must use HTTPS');return url.origin;}
export function billingConfigured(){try{return !!(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET&&process.env.SUPABASE_SERVICE_ROLE_KEY&&configuredPrices().length&&appOrigin());}catch{return false;}}
