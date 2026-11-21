/** Public listing connectors. Import only from configured, trusted employer board identifiers. */
export type Source = 'greenhouse' | 'lever' | 'lever_eu' | 'ashby' | 'smartrecruiters';
export type NormalizedJob = {source:Source; source_id:string; title:string; company:string; location:string; description:string; listing_url:string; published_at:string|null; last_verified_at:string; active:true};
// These are safety limits, not provider guarantees. Fail the entire import rather than silently importing a partial board.
const MAX_RESPONSE_BYTES=8*1024*1024, MAX_TOTAL_BYTES=32*1024*1024, MAX_JOBS=10_000, MAX_PAGES=200;
function validUrl(value:unknown):string { if(typeof value!=='string'||value.length>4096) throw new Error('Invalid listing URL'); const url=new URL(value); if(url.protocol!=='https:'||url.username||url.password) throw new Error('Listing URL must use HTTPS without credentials'); return url.toString(); }
function date(value:unknown):string|null { const d=typeof value==='number'?new Date(value):typeof value==='string'?new Date(value):null; return d&&!Number.isNaN(d.valueOf())?d.toISOString():null; }
function text(value:unknown,max:number,required=false):string {if(value==null&&!required)return '';if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new Error('Invalid listing field');return value;}
function descriptionFor(source:Source,j:Record<string,unknown>):string {
 if(source==='greenhouse')return text(j.content,1_000_000);
 if(source==='ashby')return text(j.descriptionPlain??j.descriptionHtml,1_000_000);
 if(source==='smartrecruiters')return '';
 const parts=[text(j.descriptionPlain??j.description,1_000_000)];
 if(j.lists!=null){if(!Array.isArray(j.lists)||j.lists.length>100)throw new Error('Invalid listing field');for(const section of j.lists){if(!section||typeof section!=='object'||Array.isArray(section))throw new Error('Invalid listing field');parts.push(text(section.text,10000),text(section.content,1_000_000));}}
 parts.push(text(j.additionalPlain??j.additional,1_000_000));const joined=parts.filter(Boolean).join('\n\n');if(joined.length>1_000_000)throw new Error('Invalid listing field');return joined;
}
async function readJson(response:Response):Promise<{data:unknown;bytes:number}> {
 const declared=response.headers.get('content-length');if(declared&&/^\d+$/.test(declared)&&Number(declared)>MAX_RESPONSE_BYTES)throw new Error('Provider response too large');
 if(!response.body)throw new Error('Empty provider response');
 const reader=response.body.getReader();const chunks:Uint8Array[]=[];let bytes=0;
 try {for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_RESPONSE_BYTES){await reader.cancel();throw new Error('Provider response too large');}chunks.push(value);}}finally{reader.releaseLock();}
 const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength;}
 return {data:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer)),bytes};
}
export async function fetchBoard(source:Source, board:string, company:string, transport:typeof fetch=fetch):Promise<NormalizedJob[]> {
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(board) || !company.trim() || company.length>200) throw new Error('Invalid board or company');
 const encoded=encodeURIComponent(board); const urls:Record<Source,string>={greenhouse:`https://boards-api.greenhouse.io/v1/boards/${encoded}/jobs?content=true`,lever:`https://api.lever.co/v0/postings/${encoded}?mode=json&limit=100`,lever_eu:`https://api.eu.lever.co/v0/postings/${encoded}?mode=json&limit=100`,ashby:`https://api.ashbyhq.com/posting-api/job-board/${encoded}`,smartrecruiters:`https://api.smartrecruiters.com/v1/companies/${encoded}/postings?limit=100`};
 if(!Object.hasOwn(urls,source))throw new Error('Unknown job source');
 const isLever=source==='lever'||source==='lever_eu';
 const now=new Date().toISOString(); const all:NormalizedJob[]=[]; const seen=new Set<string>(); let url:string|undefined=isLever?`${urls[source]}&skip=0`:urls[source]; let offset=0,pages=0,totalBytes=0;let expectedTotal:number|undefined;
 do { if(++pages>MAX_PAGES)throw new Error('Provider pagination limit exceeded'); const response=await transport(url,{signal:AbortSignal.timeout(30000),redirect:'error'}); if(!response.ok) throw new Error(`${source} returned HTTP ${response.status}`); const decoded=await readJson(response);totalBytes+=decoded.bytes;if(totalBytes>MAX_TOTAL_BYTES)throw new Error('Provider board size limit exceeded');const data=decoded.data as Record<string,unknown>; const items=source==='greenhouse'?data?.jobs:isLever?data:source==='ashby'?data?.jobs:data?.content; if(!Array.isArray(items)) throw new Error(`Invalid ${source} response`);
  if(offset+items.length>MAX_JOBS)throw new Error('Provider listing limit exceeded');
  for(const j of items){if(!j||typeof j!=='object'||Array.isArray(j))throw new Error(`Invalid ${source} listing`);const id=source==='ashby'?j.jobUrl:j.id; const title=isLever?j.text:j.title||j.name; const listing=source==='greenhouse'?j.absolute_url:isLever?j.hostedUrl:source==='ashby'?j.jobUrl:`https://jobs.smartrecruiters.com/${encoded}/${encodeURIComponent(String(j.id))}`; if((typeof id!=='string'&&typeof id!=='number')||(typeof id==='number'&&(!Number.isSafeInteger(id)||id<0))||!String(id).trim()||!listing)throw new Error(`Invalid ${source} listing`); const uniqueId=`${board}:${String(id)}`; if(uniqueId.length>4096||seen.has(uniqueId))throw new Error(`Invalid or duplicate ${source} listing`);seen.add(uniqueId);all.push({source,source_id:uniqueId,title:text(title,500,true),company,location:text(source==='greenhouse'?j.location?.name:isLever?j.categories?.location:source==='ashby'?j.location:j.location?.city,1000),description:descriptionFor(source,j),listing_url:validUrl(listing),published_at:date(source==='greenhouse'?j.updated_at:isLever?j.createdAt:source==='ashby'?j.publishedAt:j.releasedDate),last_verified_at:now,active:true}); }
  offset+=items.length;
  if(source==='smartrecruiters'){const total=data.totalFound;if(!Number.isInteger(total)||Number(total)<0||Number(total)>MAX_JOBS)throw new Error('Invalid SmartRecruiters pagination');if(expectedTotal!==undefined&&expectedTotal!==total)throw new Error('SmartRecruiters board changed during pagination');expectedTotal=Number(total);if(offset>expectedTotal||(offset<expectedTotal&&items.length===0))throw new Error('Incomplete SmartRecruiters pagination');url=offset<expectedTotal?`${urls[source]}&offset=${offset}`:undefined;}
  else if(isLever && items.length===100)url=`${urls[source]}&skip=${offset}`;
  else url=undefined;
 } while(url); return all;
}
