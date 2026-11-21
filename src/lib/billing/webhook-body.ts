export async function readBoundedBody(request:Request,limit=1_000_000):Promise<Buffer> {
 const declared=Number(request.headers.get('content-length')||0);if(declared>limit)throw new Error('Too large');if(!request.body)return Buffer.alloc(0);const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('Too large');}chunks.push(value);}}finally{reader.releaseLock();}return Buffer.concat(chunks);
}
