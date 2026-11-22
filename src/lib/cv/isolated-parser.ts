import 'server-only';
import {createConnection} from 'node:net';
const MAX_BYTES=4*1024*1024, MAX_RESPONSE=200_000;
/** Requests extraction from a separately deployed, resource-isolated parser. Never falls back to in-process parsing. */
export async function extractIsolated(bytes:Uint8Array,extension:string,socketPath=process.env.CV_PARSER_SOCKET,timeoutMs=30000):Promise<string>{
 if(!socketPath||!socketPath.startsWith('/')||socketPath.includes('\0')||socketPath.length>100||!['pdf','docx'].includes(extension)||!bytes.byteLength||bytes.byteLength>MAX_BYTES||!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new Error('Isolated parser unavailable');
 return new Promise((resolve,reject)=>{
  let settled=false;let reply=Buffer.alloc(0);const socket=createConnection({path:socketPath});const timer=setTimeout(()=>finish(),timeoutMs);
  function finish(text?:string){if(settled)return;settled=true;clearTimeout(timer);socket.destroy();if(text===undefined)reject(new Error('Isolated parser unavailable or rejected document'));else resolve(text);}
  socket.once('error',()=>finish());socket.once('close',()=>finish());
  socket.once('connect',()=>{const header=Buffer.alloc(5);header[0]=extension==='pdf'?1:2;header.writeUInt32BE(bytes.byteLength,1);socket.write(header);socket.write(bytes);});
  socket.on('data',(chunk:Buffer)=>{reply=Buffer.concat([reply,chunk]);if(reply.length>MAX_RESPONSE)return finish();const newline=reply.indexOf(10);if(newline<0)return;try{const value:unknown=JSON.parse(reply.subarray(0,newline).toString('utf8'));if(!value||typeof value!=='object'||!('text' in value)||typeof value.text!=='string'||value.text.length<20||value.text.length>40000)return finish();finish(value.text);}catch{finish();}});
 });
}
