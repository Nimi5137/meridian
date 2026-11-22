import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const m=vi.hoisted(()=>({scan:vi.fn(),extract:vi.fn(),download:vi.fn(),from:vi.fn(),generate:vi.fn()}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error(`REDIRECT:${url}`);}}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
vi.mock('@/lib/auth',()=>({requireUser:async()=>({user:{id:'owner'},db:{from:m.from,storage:{from:()=>({download:m.download})}}})}));
vi.mock('@/lib/billing/access',()=>({hasAiAccess:async()=>true}));
vi.mock('@/lib/ai/service',()=>({aiForTask:()=>({}),generateStructured:m.generate}));
vi.mock('@/lib/ai/usage',()=>({trackedAdapter:vi.fn()}));
vi.mock('@/lib/cv/malware-scan',()=>({scanCv:m.scan}));
vi.mock('@/lib/cv/isolated-parser',()=>({extractIsolated:m.extract}));
import {extractProfile} from '../src/app/profile/import-actions';
const id='5bca9447-210f-4c10-90a5-e77b862651a0';
beforeEach(()=>{vi.clearAllMocks();const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{id,storage_path:'owner/resume.pdf'},error:null})};m.from.mockReturnValue(q);m.download.mockResolvedValue({data:new Blob(['%PDF-synthetic']),error:null});});
describe('CV extraction safety gate',()=>{
 it.each(['infected','unavailable'])('blocks %s documents before parsing or AI calls',async verdict=>{m.scan.mockResolvedValue(verdict);const form=new FormData();form.set('cv_id',id);await expect(extractProfile(form)).rejects.toThrow('REDIRECT:');expect(m.extract).not.toHaveBeenCalled();expect(m.generate).not.toHaveBeenCalled();});
 it('does not call AI if the isolated parser is unavailable',async()=>{m.scan.mockResolvedValue('clean');m.extract.mockRejectedValue(new Error('unavailable'));const form=new FormData();form.set('cv_id',id);await expect(extractProfile(form)).rejects.toThrow('REDIRECT:');expect(m.extract).toHaveBeenCalled();expect(m.generate).not.toHaveBeenCalled();});
});
