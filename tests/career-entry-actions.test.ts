import {beforeEach,describe,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({from:vi.fn(),insert:vi.fn(),select:vi.fn(),single:vi.fn(),rpc:vi.fn(),revalidate:vi.fn()}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error(`REDIRECT ${url}`);}}));
vi.mock('next/cache',()=>({revalidatePath:m.revalidate}));
vi.mock('@/lib/auth',()=>({requireUser:async()=>({db:{from:m.from,rpc:m.rpc},user:{id:'user-a'}})}));
import {saveCareerEntry,deleteCareerEntry} from '../src/app/profile/entry-actions';
const initial={kind:'idle' as const,message:''};
const id='5bca9447-210f-4c10-90a5-e77b862651a0',version='2026-11-20T10:20:30.123456+00:00';
function form(existing=true){const f=new FormData();f.set('id',existing?id:'');if(existing)f.set('version',version);f.set('kind','project');f.set('title','A project');f.set('organization','');f.set('start_date','');f.set('end_date','');f.set('description','');return f;}
beforeEach(()=>{vi.clearAllMocks();const chain={insert:m.insert,select:m.select,single:m.single};m.from.mockReturnValue(chain);m.insert.mockReturnValue(chain);m.select.mockReturnValue(chain);m.single.mockResolvedValue({data:{id},error:null});m.rpc.mockResolvedValue({data:'updated',error:null});});
describe('career entry optimistic concurrency',()=>{
 it('passes the exact loaded version and content to the owner-scoped update RPC',async()=>{await expect(saveCareerEntry(initial,form())).rejects.toThrow('/profile?saved=1');expect(m.rpc).toHaveBeenCalledWith('update_career_entry_if_unchanged',{p_id:id,p_expected:version,p_kind:'project',p_title:'A project',p_organization:'',p_start_date:null,p_end_date:null,p_description:''});expect(m.from).not.toHaveBeenCalled();});
 it('reports a conflict instead of claiming a stale update succeeded',async()=>{m.rpc.mockResolvedValue({data:'changed_or_unavailable',error:null});await expect(saveCareerEntry(initial,form())).resolves.toMatchObject({kind:'conflict'});expect(m.revalidate).not.toHaveBeenCalled();});
 it('requires a valid version and does not update on missing version',async()=>{const f=form();f.delete('version');await expect(saveCareerEntry(initial,f)).resolves.toMatchObject({kind:'conflict'});expect(m.rpc).not.toHaveBeenCalled();});
 it('creates an entry without requiring a previous version',async()=>{await expect(saveCareerEntry(initial,form(false))).rejects.toThrow('/profile?saved=1');expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({user_id:'user-a',title:'A project'}));});
 it('guards deletion with the RPC version and reports a conflict',async()=>{m.rpc.mockResolvedValue({data:'changed_or_unavailable',error:null});await expect(deleteCareerEntry(form())).rejects.toThrow('Entry%20changed');expect(m.rpc).toHaveBeenCalledWith('delete_career_entry_if_unchanged',{p_id:id,p_expected:version});expect(m.revalidate).not.toHaveBeenCalled();});
 it('rejects an invalid id without using it in the redirect',async()=>{const f=form();f.set('id','../../settings?untrusted=yes');await expect(saveCareerEntry(initial,f)).resolves.toMatchObject({kind:'error',message:'Invalid entry.'});expect(m.from).not.toHaveBeenCalled();expect(m.rpc).not.toHaveBeenCalled();});
 it('preserves edits on backend failure',async()=>{m.rpc.mockResolvedValue({data:null,error:{message:'unavailable'}});await expect(saveCareerEntry(initial,form())).resolves.toMatchObject({kind:'error'});expect(m.revalidate).not.toHaveBeenCalled();});
});
