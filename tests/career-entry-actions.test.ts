import {beforeEach,describe,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({from:vi.fn(),update:vi.fn(),insert:vi.fn(),delete:vi.fn(),eq:vi.fn(),select:vi.fn(),maybeSingle:vi.fn(),single:vi.fn(),revalidate:vi.fn()}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error(`REDIRECT ${url}`);}}));
vi.mock('next/cache',()=>({revalidatePath:m.revalidate}));
vi.mock('@/lib/auth',()=>({requireUser:async()=>({db:{from:m.from},user:{id:'user-a'}})}));
import {saveCareerEntry,deleteCareerEntry} from '../src/app/profile/entry-actions';
const initial={kind:'idle' as const,message:''};
const id='5bca9447-210f-4c10-90a5-e77b862651a0',version='2026-11-20T10:20:30.123456+00:00';
function form(existing=true){const f=new FormData();f.set('id',existing?id:'');if(existing)f.set('version',version);f.set('kind','project');f.set('title','A project');f.set('organization','');f.set('start_date','');f.set('end_date','');f.set('description','');return f;}
beforeEach(()=>{vi.clearAllMocks();const chain={update:m.update,insert:m.insert,delete:m.delete,eq:m.eq,select:m.select,maybeSingle:m.maybeSingle,single:m.single};m.from.mockReturnValue(chain);m.update.mockReturnValue(chain);m.insert.mockReturnValue(chain);m.delete.mockReturnValue(chain);m.eq.mockReturnValue(chain);m.select.mockReturnValue(chain);m.maybeSingle.mockResolvedValue({data:{id},error:null});m.single.mockResolvedValue({data:{id},error:null});});
describe('career entry optimistic concurrency',()=>{
 it('guards an update by owner, id and the exact loaded version',async()=>{await expect(saveCareerEntry(initial,form())).rejects.toThrow('/profile?saved=1');expect(m.eq).toHaveBeenCalledWith('user_id','user-a');expect(m.eq).toHaveBeenCalledWith('id',id);expect(m.eq).toHaveBeenCalledWith('updated_at',version);expect(Date.parse(m.update.mock.calls[0][0].updated_at)).toBeGreaterThan(Date.parse(version));});
 it('reports a conflict instead of claiming a stale update succeeded',async()=>{m.maybeSingle.mockResolvedValue({data:null,error:null});await expect(saveCareerEntry(initial,form())).resolves.toMatchObject({kind:'conflict'});expect(m.revalidate).not.toHaveBeenCalled();});
 it('requires a valid version and does not update on missing version',async()=>{const f=form();f.delete('version');await expect(saveCareerEntry(initial,f)).resolves.toMatchObject({kind:'conflict'});expect(m.update).not.toHaveBeenCalled();});
 it('creates an entry without requiring a previous version',async()=>{await expect(saveCareerEntry(initial,form(false))).rejects.toThrow('/profile?saved=1');expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({user_id:'user-a',title:'A project'}));});
 it('guards deletion by version and reports a conflict',async()=>{m.maybeSingle.mockResolvedValue({data:null,error:null});await expect(deleteCareerEntry(form())).rejects.toThrow('Entry%20changed');expect(m.eq).toHaveBeenCalledWith('updated_at',version);expect(m.revalidate).not.toHaveBeenCalled();});
 it('rejects an invalid id without using it in the redirect',async()=>{const f=form();f.set('id','../../settings?untrusted=yes');await expect(saveCareerEntry(initial,f)).resolves.toMatchObject({kind:'error',message:'Invalid entry.'});expect(m.from).not.toHaveBeenCalled();});
});
