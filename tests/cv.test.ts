import {describe,it,expect} from 'vitest';
import { ZipFile } from 'yazl';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { extractCvText } from '../src/lib/cv/extract-text';
import { extractionSchema } from '../src/lib/cv/schemas';
async function zipFile(entries:Record<string,string>) {const zip=new ZipFile();for(const [name,text] of Object.entries(entries))zip.addBuffer(Buffer.from(text),name);zip.end();const chunks:Buffer[]=[];for await(const chunk of zip.outputStream)chunks.push(Buffer.from(chunk));return Buffer.concat(chunks);}
describe('CV text extraction',()=>{
 it('extracts paragraphs from DOCX',async()=>{const file=await zipFile({'word/document.xml':'<w:document xmlns:w="x"><w:body><w:p><w:r><w:t>Jane Doe software engineer</w:t></w:r></w:p><w:p><w:r><w:t>Experienced in TypeScript</w:t></w:r></w:p></w:body></w:document>'});expect(await extractCvText(file,'docx')).toContain('Jane Doe software engineer\nExperienced in TypeScript');});
 it('extracts text from PDF',async()=>{const doc=await PDFDocument.create();const font=await doc.embedFont(StandardFonts.Helvetica);doc.addPage().drawText('Jane Doe software engineer', {font});const bytes=await doc.save();expect(await extractCvText(Buffer.from(bytes),'pdf')).toContain('Jane Doe software engineer');});
 it('rejects invalid or unsupported files',async()=>{await expect(extractCvText(Buffer.from('not a pdf'),'pdf')).rejects.toThrow();await expect(extractCvText(Buffer.from('anything'),'exe')).rejects.toThrow();});
 it('rejects DOCX without a document',async()=>{const file=await zipFile({'other.txt':'hello'});await expect(extractCvText(file,'docx')).rejects.toThrow();});
 it('rejects oversized extraction fields',()=>expect(extractionSchema.safeParse({full_name:'x'.repeat(121),headline:'',location:'',summary:'',skills:''}).success).toBe(false));
});
