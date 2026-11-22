import {afterEach,describe,expect,it,vi} from 'vitest';
import {spawn,type ChildProcess} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ZipFile} from 'yazl';
vi.mock('server-only',()=>({}));
import {extractIsolated} from '../src/lib/cv/isolated-parser';
let child:ChildProcess|undefined,dir:string|undefined;
afterEach(async()=>{if(child&&child.exitCode===null){const proc=child;await new Promise<void>(resolve=>{proc.once('exit',()=>resolve());proc.kill('SIGTERM');});}child=undefined;if(dir)await rm(dir,{recursive:true,force:true});dir=undefined;});
async function makeDoc(){const zip=new ZipFile();zip.addBuffer(Buffer.from('<w:doc xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:t>Synthetic resume for parser service</w:t></w:p></w:doc>'),'word/document.xml');zip.end();const chunks:Buffer[]=[];for await(const c of zip.outputStream)chunks.push(Buffer.from(c));return Buffer.concat(chunks);}
async function launch(){dir=await mkdtemp(join(tmpdir(),'meridian-parser-'));const socket=join(dir,'parser.sock');const proc=spawn(process.execPath,['--import','tsx','scripts/cv-parser-service.ts'],{cwd:process.cwd(),env:{NODE_ENV:'test',PATH:process.env.PATH,CV_PARSER_SOCKET:socket},stdio:['ignore','pipe','pipe']});child=proc;await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('parser did not start')),10000);proc.stdout!.once('data',()=>{clearTimeout(timer);resolve();});proc.once('exit',()=>{clearTimeout(timer);reject(new Error('parser exited'));});});return socket;}
describe('isolated parser protocol',()=>{
 it('extracts a synthetic DOCX through the separate parser process',async()=>{const socket=await launch();expect(await extractIsolated(await makeDoc(),'docx',socket)).toBe('Synthetic resume for parser service');});
 it('fails closed for invalid documents and unavailable service',async()=>{const socket=await launch();await expect(extractIsolated(Buffer.from('not pdf'),'pdf',socket)).rejects.toThrow();await expect(extractIsolated(Buffer.from('test'),'pdf',join(dir!,'missing.sock'))).rejects.toThrow();await expect(extractIsolated(Buffer.from('test'),'exe',socket)).rejects.toThrow();});
});
