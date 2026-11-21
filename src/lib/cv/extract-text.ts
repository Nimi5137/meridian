/** Server-side extraction with bounded input and output. Scanned PDFs require OCR (not supported). */
import { fromBuffer } from 'yauzl';
import { SaxesParser } from 'saxes';
const MAX_FILE = 4 * 1024 * 1024;
const MAX_XML = 2 * 1024 * 1024;
const MAX_TEXT = 40000;

function docxXml(buffer: Buffer): Promise<string> {
 return new Promise((resolve,reject)=>{
  fromBuffer(buffer,{lazyEntries:true,validateEntrySizes:true},(err,zip)=>{
   if(err || !zip) return reject(new Error('Invalid DOCX archive'));
   let xml:string|undefined; let count=0; let settled=false;
   const fail=()=>{if(!settled){settled=true; zip.close(); reject(new Error('Invalid or oversized DOCX archive'));}};
   zip.on('error',fail);
   zip.on('entry',entry=>{
    if(++count>1000) return fail();
    if(entry.fileName!=='word/document.xml') {zip.readEntry();return;}
    if(xml!==undefined || entry.uncompressedSize>MAX_XML || (entry.generalPurposeBitFlag & 1)!==0) return fail();
    zip.openReadStream(entry,(error,stream)=>{
     if(error||!stream) return fail(); const chunks:Buffer[]=[]; let size=0;
     stream.on('error',fail); stream.on('data',(chunk:Buffer)=>{size+=chunk.length; if(size>MAX_XML){stream.destroy();fail();return;} chunks.push(chunk);});
     stream.on('end',()=>{if(settled)return;xml=Buffer.concat(chunks).toString('utf8');zip.readEntry();});
    });
   });
   zip.on('end',()=>{if(settled)return;settled=true;if(xml===undefined)reject(new Error('DOCX document text not found'));else resolve(xml);});
   zip.readEntry();
  });
 });
}
function xmlText(xml:string):string {
 // DOCX producers may use any XML prefix. Compare the namespace, not the
 // literal "w:" prefix, and do not mistake unrelated XML for document text.
 const wordNamespaces=new Set(['http://schemas.openxmlformats.org/wordprocessingml/2006/main','http://purl.oclc.org/ooxml/wordprocessingml/main']);
 let insideText=false; let result=''; const parser=new SaxesParser({xmlns:true});
 const append=(value:string)=>{if(result.length+value.length>MAX_TEXT)throw new Error('Document text too long');result+=value;};
 parser.on('doctype',()=>{throw new Error('DOCX document contains a DTD');});
 parser.on('opentag',tag=>{if(!wordNamespaces.has(tag.uri))return;if(tag.local==='t')insideText=true;else if(tag.local==='tab')append('\t');else if(tag.local==='br'||tag.local==='cr')append('\n');});
 parser.on('text',text=>{if(insideText)append(text);});
 parser.on('closetag',tag=>{if(!wordNamespaces.has(tag.uri))return;if(tag.local==='t')insideText=false;else if(tag.local==='p')append('\n');});
 try {parser.write(xml).close();} catch {throw new Error('DOCX document text is invalid or too long');}
 return result.trim();
}
export async function extractCvText(buffer:Buffer,extension:string):Promise<string> {
 if(!buffer.length || buffer.length>MAX_FILE) throw new Error('File size is invalid');
 let text='';
 if(extension==='docx') {if(buffer.subarray(0,4).toString('hex')!=='504b0304') throw new Error('Invalid DOCX');text=xmlText(await docxXml(buffer));}
 else if(extension==='pdf') {
  if(buffer.subarray(0,5).toString()!=='%PDF-') throw new Error('Invalid PDF');
  const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task=pdfjs.getDocument({data:new Uint8Array(buffer),disableFontFace:true,useSystemFonts:false});
  try {const pdf=await task.promise; if(pdf.numPages>30) throw new Error('PDF has too many pages');
   for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();for(const item of content.items){if('str' in item){text+=item.str+(item.hasEOL?'\n':' ');if(text.length>MAX_TEXT)throw new Error('Document text too long');}}text+='\n';page.cleanup();}
  } finally {await task.destroy();}
 } else throw new Error('Unsupported file type');
 text=text.trim(); if(text.length<20) throw new Error('No usable text found. Scanned PDFs require OCR, which is not supported.'); return text;
}
