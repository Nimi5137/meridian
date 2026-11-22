import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
vi.mock('server-only',()=>({}));
const {exchange}=vi.hoisted(()=>({exchange:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{exchangeCodeForSession:exchange}})}));
import {GET} from '../src/app/auth/callback/route';
beforeEach(()=>{vi.clearAllMocks();process.env.NEXT_PUBLIC_APP_URL='https://app.example.org';exchange.mockResolvedValue({error:null});});afterEach(()=>{delete process.env.NEXT_PUBLIC_APP_URL;});
describe('authentication callback',()=>{
 it('only permits the recovery destination on the configured origin',async()=>{const response=await GET(new Request('https://attacker.example/auth/callback?code=123&next=%2Fsettings'));expect(response.headers.get('location')).toBe('https://app.example.org/settings');expect(response.headers.get('cache-control')).toBe('no-store');expect(response.headers.get('referrer-policy')).toBe('no-referrer');});
 it('rejects backslash, protocol-relative and external redirects',async()=>{for(const target of ['/\\evil.example','/\t/evil.example','//evil.example','https://evil.example','/%5c%5cevil.example']){const url=new URL('https://attacker.example/auth/callback');url.searchParams.set('code','123');url.searchParams.set('next',target);const response=await GET(new Request(url));expect(response.headers.get('location')).toBe('https://app.example.org/dashboard');}});
 it('fails closed when the canonical app URL is missing or invalid',async()=>{delete process.env.NEXT_PUBLIC_APP_URL;expect((await GET(new Request('https://attacker.example/auth/callback?code=123'))).status).toBe(503);expect(exchange).not.toHaveBeenCalled();process.env.NEXT_PUBLIC_APP_URL='http://evil.example';expect((await GET(new Request('https://attacker.example/auth/callback?code=123'))).status).toBe(503);});
 it('does not leak the code or details on exchange failure',async()=>{exchange.mockRejectedValue(new Error('secret'));const response=await GET(new Request('https://attacker.example/auth/callback?code=secret'));expect(response.headers.get('location')).toMatch(/^https:\/\/app\.example\.org\/login\?/);expect(response.headers.get('location')).not.toContain('secret');});
});
