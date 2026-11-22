import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const m=vi.hoisted(()=>({scan:vi.fn(),storage:vi.fn(),from:vi.fn()}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error(`REDIRECT:${url}`);}}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
vi.mock('@/lib/auth',()=>({requireUser:async()=>({user:{id:'owner'},db:{storage:{from:m.storage},from:m.from}})}));
vi.mock('@/lib/cv/malware-scan',()=>({scanCv:m.scan}));
import {uploadOriginal} from '../src/app/actions';
function form(){const f=new FormData();f.set('cv',new File(['%PDF-synthetic'],'cv.pdf',{type:'application/pdf'}));return f;}
beforeEach(()=>{vi.clearAllMocks();});
describe('CV upload malware gate',()=>{
 it.each(['infected','unavailable'])('rejects %s before any storage or metadata writes',async result=>{m.scan.mockResolvedValue(result);await expect(uploadOriginal(form())).rejects.toThrow('REDIRECT:');expect(m.storage).not.toHaveBeenCalled();expect(m.from).not.toHaveBeenCalled();});
 it('uploads only after a clean scanner verdict',async()=>{m.scan.mockResolvedValue('clean');const upload=vi.fn().mockResolvedValue({error:null});const insert=vi.fn().mockResolvedValue({error:null});m.storage.mockReturnValue({upload});m.from.mockReturnValue({insert});await expect(uploadOriginal(form())).rejects.toThrow('REDIRECT:/profile?uploaded=1');expect(upload).toHaveBeenCalledTimes(1);expect(insert).toHaveBeenCalledTimes(1);});
});
