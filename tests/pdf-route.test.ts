import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({requireUser:vi.fn(),select:vi.fn(),eq:vi.fn(),maybeSingle:vi.fn(),makePdf:vi.fn()}));
vi.mock('@/lib/auth',()=>({requireUser:mocks.requireUser}));
vi.mock('@/lib/documents/pdf',()=>({makePdf:mocks.makePdf,UnsupportedPdfText:class UnsupportedPdfText extends Error{}}));
import {GET} from '../src/app/documents/[id]/pdf/route';
import {UnsupportedPdfText} from '../src/lib/documents/pdf';
const id='00000000-0000-4000-8000-000000000101', user='00000000-0000-4000-8000-000000000102';
const call=(id:string)=>GET(new Request('https://example.org'),{params:Promise.resolve({id})});
beforeEach(()=>{vi.clearAllMocks();mocks.eq.mockReturnValue({eq:mocks.eq,maybeSingle:mocks.maybeSingle});mocks.select.mockReturnValue({eq:mocks.eq});mocks.requireUser.mockResolvedValue({user:{id:user},db:{from:()=>({select:mocks.select})}});mocks.maybeSingle.mockResolvedValue({data:{kind:'cv',content:'text'},error:null});mocks.makePdf.mockResolvedValue(new Uint8Array([37,80,68,70]));});
describe('PDF download route',()=>{
 it('rejects invalid IDs before touching the database',async()=>{expect((await call('wrong')).status).toBe(404);expect(mocks.requireUser).not.toHaveBeenCalled();});
 it('enforces ownership and returns a private no-store PDF attachment',async()=>{const response=await call(id);expect(response.status).toBe(200);expect(mocks.eq.mock.calls).toEqual([['id',id],['user_id',user]]);expect(response.headers.get('content-type')).toBe('application/pdf');expect(response.headers.get('content-disposition')).toContain('cv.pdf');expect(response.headers.get('cache-control')).toBe('private, no-store');});
 it('returns 404 when ownership query fails',async()=>{mocks.maybeSingle.mockResolvedValue({data:null,error:null});expect((await call(id)).status).toBe(404);expect(mocks.makePdf).not.toHaveBeenCalled();});
 it('distinguishes unsupported characters from internal errors without exposing them',async()=>{mocks.makePdf.mockRejectedValueOnce(new UnsupportedPdfText('private text'));let response=await call(id);expect(response.status).toBe(422);expect(await response.text()).not.toContain('private text');mocks.makePdf.mockRejectedValueOnce(new Error('private text'));response=await call(id);expect(response.status).toBe(500);expect(await response.text()).not.toContain('private text');});
});
