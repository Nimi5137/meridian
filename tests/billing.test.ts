import {describe,it,expect} from 'vitest';
import Stripe from 'stripe';
import {hasPaidAiEntitlement} from '../src/lib/billing/entitlements';
describe('billing',()=>{
 it('allows only active configured subscriptions',()=>{expect(hasPaidAiEntitlement([{status:'active',price_id:'configured'}],['configured'])).toBe(true);expect(hasPaidAiEntitlement([{status:'past_due',price_id:'configured'}],['configured'])).toBe(false);expect(hasPaidAiEntitlement([{status:'active',price_id:'unknown'}],['configured'])).toBe(false);});
 it('verifies webhook signatures and rejects tampering',()=>{const stripe=new Stripe('sk_test_example');const secret='whsec_example';const body=JSON.stringify({id:'evt_test',object:'event',type:'customer.subscription.updated',data:{object:{id:'sub_test'}}});const signature=stripe.webhooks.generateTestHeaderString({payload:body,secret});expect(stripe.webhooks.constructEvent(body,signature,secret).id).toBe('evt_test');expect(()=>stripe.webhooks.constructEvent(body+' ',signature,secret)).toThrow();});
});
