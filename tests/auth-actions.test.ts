import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const m=vi.hoisted(()=>({signIn:vi.fn(),signUp:vi.fn(),reset:vi.fn(),update:vi.fn()}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error(`REDIRECT ${url}`);}}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{signInWithPassword:m.signIn,signUp:m.signUp,resetPasswordForEmail:m.reset}})}));
vi.mock('@/lib/auth',()=>({requireUser:async()=>({db:{auth:{updateUser:m.update}}})}));
vi.mock('@/lib/billing/access',()=>({hasAiAccess:vi.fn()}));
import {authAction,changePassword} from '../src/app/actions';
function form(mode:string){const f=new FormData();f.set('mode',mode);f.set('email',' user@example.org ');f.set('password','  secret pass  ');return f;}
beforeEach(()=>{vi.clearAllMocks();process.env.NEXT_PUBLIC_APP_URL='https://app.example.org';m.signIn.mockResolvedValue({error:null});m.signUp.mockResolvedValue({error:null});m.reset.mockResolvedValue({error:null});m.update.mockResolvedValue({error:null});});afterEach(()=>{delete process.env.NEXT_PUBLIC_APP_URL;});
describe('authentication actions',()=>{
 it('preserves password whitespace on login, signup and change',async()=>{await expect(authAction(form('login'))).rejects.toThrow('/dashboard');expect(m.signIn).toHaveBeenCalledWith({email:'user@example.org',password:'  secret pass  '});await expect(authAction(form('signup'))).rejects.toThrow('/login?message=');expect(m.signUp).toHaveBeenCalledWith(expect.objectContaining({password:'  secret pass  ',options:{emailRedirectTo:'https://app.example.org/auth/callback'}}));await expect(changePassword(form('login'))).rejects.toThrow('/settings?saved=1');expect(m.update).toHaveBeenCalledWith({password:'  secret pass  '});});
 it('uses the canonical recovery URL and fails closed on invalid configuration',async()=>{await expect(authAction(form('forgot'))).rejects.toThrow('/forgot?message=');expect(m.reset).toHaveBeenCalledWith('user@example.org',{redirectTo:'https://app.example.org/auth/callback?next=/settings'});delete process.env.NEXT_PUBLIC_APP_URL;await expect(authAction(form('forgot'))).rejects.toThrow('not%20configured');expect(m.reset).toHaveBeenCalledTimes(1);});
});
