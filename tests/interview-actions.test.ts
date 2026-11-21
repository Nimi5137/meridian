import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({requireUser:vi.fn(),from:vi.fn(),insert:vi.fn(),update:vi.fn(),remove:vi.fn(),eq:vi.fn(),select:vi.fn(),maybeSingle:vi.fn(),revalidate:vi.fn()}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error(`REDIRECT ${url}`);}}));
vi.mock('next/cache',()=>({revalidatePath:mocks.revalidate}));
vi.mock('@/lib/auth',()=>({requireUser:mocks.requireUser}));
import {saveInterview,deleteInterview} from '../src/app/applications/interview-actions';
const app='00000000-0000-4000-8000-000000000201',user='00000000-0000-4000-8000-000000000202',id='00000000-0000-4000-8000-000000000203',version='00000000-0000-4000-8000-000000000204';
function form(){const f=new FormData();f.set('application_id',app);f.set('title','Screening');f.set('local_time','2027-02-04T15:30');f.set('timezone','Europe/Budapest');f.set('location','Online');f.set('notes','Prepare');return f;}
beforeEach(()=>{vi.clearAllMocks();mocks.requireUser.mockResolvedValue({user:{id:user},db:{from:mocks.from}});mocks.from.mockReturnValue({insert:mocks.insert,update:mocks.update,delete:mocks.remove});mocks.insert.mockResolvedValue({error:null});mocks.eq.mockReturnValue({eq:mocks.eq,select:mocks.select});mocks.select.mockReturnValue({maybeSingle:mocks.maybeSingle});mocks.update.mockReturnValue({eq:mocks.eq});mocks.remove.mockReturnValue({eq:mocks.eq});mocks.maybeSingle.mockResolvedValue({data:{id},error:null});});
describe('interview actions',()=>{
 it('inserts a user-owned interview with a timezone-resolved instant',async()=>{await expect(saveInterview(form())).rejects.toThrow('?interview=1');expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({user_id:user,application_id:app,starts_at:'2027-02-04T14:30:00Z'}));});
 it('rejects invalid and ambiguous times without writing',async()=>{const f=form();f.set('local_time','2027-10-31T02:30');await expect(saveInterview(f)).rejects.toThrow('Invalid%20interview');expect(mocks.from).not.toHaveBeenCalled();});
 it('fences updates by user, application, id, and version',async()=>{const f=form();f.set('interview_id',id);f.set('version',version);await expect(saveInterview(f)).rejects.toThrow('?interview=1');expect(mocks.eq.mock.calls).toEqual([['id',id],['user_id',user],['application_id',app],['version',version]]);});
 it('rejects stale updates and requires confirmation to delete',async()=>{const f=form();f.set('interview_id',id);f.set('version',version);mocks.maybeSingle.mockResolvedValue({data:null,error:null});await expect(saveInterview(f)).rejects.toThrow('changed%20or%20is%20unavailable');await expect(deleteInterview(f)).rejects.toThrow('Confirm%20interview');expect(mocks.remove).not.toHaveBeenCalled();f.set('confirm','yes');await expect(deleteInterview(f)).rejects.toThrow('changed%20or%20is%20unavailable');});
});
