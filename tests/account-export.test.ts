import {beforeEach,describe,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({requireUser:vi.fn()}));
vi.mock('@/lib/auth',()=>({requireUser:m.requireUser}));
import {GET} from '../src/app/account/export/route';
const uid='00000000-0000-4000-8000-000000000211';
type Row=Record<string,string>;
function database(tables:Record<string,Row[]>,failure?:string){
 const calls:{table:string;owner:string;cursor?:string;limit:number}[]=[];
 const db={from:(table:string)=>({select:()=>{let owner='',key='id',cursor:string|undefined,limit=0;const q={eq:(_col:string,value:string)=>{owner=value;return q;},order:(name:string)=>{key=name;return q;},limit:(count:number)=>{limit=count;return q;},gt:(_name:string,value:string)=>{cursor=value;return q;},then:(resolve:(value:{data:Row[]|null;error:unknown})=>unknown)=>{calls.push({table,owner,cursor,limit});const data=(tables[table]||[]).filter(row=>cursor===undefined||row[key]>cursor).sort((a,b)=>a[key].localeCompare(b[key])).slice(0,limit);return Promise.resolve(resolve({data:table===failure?null:data,error:table===failure?'database error':null}));}};return q;}})};
 return {db,calls};
}
beforeEach(()=>vi.clearAllMocks());
describe('account export',()=>{
 it('uses owner-scoped keyset pagination and includes interviews',async()=>{const rows=Array.from({length:51},(_,i)=>({id:String(i).padStart(3,'0'),title:`Interview ${i}`}));const {db,calls}=database({interviews:rows});m.requireUser.mockResolvedValue({db,user:{id:uid,email:'test@example.org'}});const response=await GET();expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');const result=await response.json();expect(result.data.interviews).toHaveLength(51);expect(calls.every(c=>c.owner===uid&&c.limit===50)).toBe(true);expect(calls.filter(c=>c.table==='interviews').map(c=>c.cursor)).toEqual([undefined,'049']);expect(result.note).toContain('not a transactional snapshot');});
 it('fails without returning a partial export on a query error',async()=>{const {db}=database({},'interviews');m.requireUser.mockResolvedValue({db,user:{id:uid}});const response=await GET();expect(response.status).toBe(500);expect(await response.text()).not.toContain('database error');});
 it('rejects exports over the byte limit even if row counts are small',async()=>{const {db}=database({profiles:[{user_id:uid,summary:'é'.repeat(4*1024*1024+1)}]});m.requireUser.mockResolvedValue({db,user:{id:uid}});const response=await GET();expect(response.status).toBe(413);expect(response.headers.get('cache-control')).toBe('private, no-store');});
 it('rejects exports over the global row limit',async()=>{const rows=Array.from({length:10001},(_,i)=>({id:String(i).padStart(6,'0')}));const {db}=database({interviews:rows});m.requireUser.mockResolvedValue({db,user:{id:uid}});expect((await GET()).status).toBe(413);});
});
