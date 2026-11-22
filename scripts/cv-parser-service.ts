/** Run only inside the documented isolated container, with no credentials or network access. */
import {createServer} from 'node:net';
import {chmodSync} from 'node:fs';
import {extractCvText} from '../src/lib/cv/extract-text';

const path=process.env.CV_PARSER_SOCKET;
if(!path||!path.startsWith('/')||path.includes('\0')||path.length>100)throw new Error('CV_PARSER_SOCKET must be an absolute Unix socket path');
let busy=false;
const server=createServer(socket=>{
 if(busy){socket.end('{"error":"busy"}\n');return;}busy=true;let released=false,started=false;let data=Buffer.alloc(0);
 const release=()=>{if(!released){released=true;busy=false;}};
 socket.setTimeout(15000,()=>socket.destroy());socket.on('error',()=>{});socket.once('close',()=>{if(!started)release();});
 socket.on('data',chunk=>{
  if(started)return;data=Buffer.concat([data,chunk]);if(data.length<5)return;
  const type=data[0],length=data.readUInt32BE(1);if((type!==1&&type!==2)||length===0||length>4*1024*1024||data.length>length+5){socket.end('{"error":"invalid"}\n');release();return;}
  if(data.length===length+5){started=true;const input=data.subarray(5);data=Buffer.alloc(0);void extractCvText(input,type===1?'pdf':'docx').then(text=>socket.end(JSON.stringify({text})+'\n')).catch(()=>socket.end('{"error":"invalid"}\n')).finally(release);}
 });
});
server.maxConnections=10;
server.listen(path,()=>{chmodSync(path,0o660);process.stdout.write('CV parser socket ready\n');});
