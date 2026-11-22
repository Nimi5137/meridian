import {describe,it,expect,vi,beforeEach} from 'vitest';
import Stripe from 'stripe';
vi.mock('server-only',()=>({}));
const {rpc,lookup,retrieve}=vi.hoisted(()=>({rpc:vi.fn(),lookup:vi.fn(),retrieve:vi.fn()}));
vi.mock('../src/lib/supabase/admin',()=>({adminClient:()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:lookup})})}),rpc})}));
const stripe=new Stripe('sk_test_example');
vi.mock('../src/lib/billing/config',async()=>{const StripeClass=(await import('stripe')).default;const client=new StripeClass('sk_test_example');client.subscriptions.retrieve=retrieve;return {stripeClient:()=>client};});
import {POST} from '../src/app/api/stripe/webhook/route';
const secret='whsec_example';
function request(payload:string,signature?:string){return new Request('http://localhost/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':signature||stripe.webhooks.generateTestHeaderString({payload,secret})},body:payload});}
describe('Stripe webhook',()=>{beforeEach(()=>{process.env.STRIPE_WEBHOOK_SECRET=secret;process.env.STRIPE_SECRET_KEY='sk_test_example';process.env.SUPABASE_SERVICE_ROLE_KEY='test';vi.clearAllMocks();});
 it('rejects invalid signatures without database access',async()=>{const result=await POST(request('{}','invalid'));expect(result.status).toBe(400);expect(rpc).not.toHaveBeenCalled();});
 it('retrieves the current subscription and records verified events',async()=>{const payload=JSON.stringify({id:'evt_1',object:'event',created:100,type:'customer.subscription.updated',data:{object:{id:'sub_1'}}});retrieve.mockResolvedValue({id:'sub_1',customer:'cus_1',status:'active',items:{data:[{price:{id:'price_1'},current_period_end:200}]}});lookup.mockResolvedValue({data:{user_id:'00000000-0000-4000-8000-000000000041'},error:null});rpc.mockResolvedValue({data:true,error:null});const result=await POST(request(payload));expect(result.status).toBe(200);expect(rpc).toHaveBeenCalledWith('record_billing_subscription',expect.objectContaining({p_event:'evt_1',p_subscription:'sub_1',p_status:'active',p_created:100}));});
 it('rejects oversized requests',async()=>{const payload='x'.repeat(1000001);const result=await POST(request(payload,'irrelevant'));expect(result.status).toBe(413);expect(rpc).not.toHaveBeenCalled();});
});
