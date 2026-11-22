import {describe,it,expect} from 'vitest';
import { ZipFile } from 'yazl';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { extractCvText } from '../src/lib/cv/extract-text';
import { extractionSchema } from '../src/lib/cv/schemas';
async function zipFile(entries:Record<string,string>) {const zip=new ZipFile();for(const [name,text] of Object.entries(entries))zip.addBuffer(Buffer.from(text),name);zip.end();const chunks:Buffer[]=[];for await(const chunk of zip.outputStream)chunks.push(Buffer.from(chunk));return Buffer.concat(chunks);}
describe('CV text extraction',()=>{
 it('extracts paragraphs from DOCX',async()=>{const file=await zipFile({'word/document.xml':'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Jane Doe software engineer</w:t></w:r></w:p><w:p><w:r><w:t>Experienced in TypeScript</w:t></w:r></w:p></w:body></w:document>'});expect(await extractCvText(file,'docx')).toContain('Jane Doe software engineer\nExperienced in TypeScript');});
 it.each(['http://schemas.openxmlformats.org/wordprocessingml/2006/main','http://purl.oclc.org/ooxml/wordprocessingml/main'])('supports arbitrary Word namespace prefixes and line breaks (%s)',async ns=>{const file=await zipFile({'word/document.xml':`<doc xmlns="${ns}"><p><r><t>Jane Doe software engineer</t><tab/><t>TypeScript</t><br/><t>Remote</t></r></p></doc>`});expect(await extractCvText(file,'docx')).toBe('Jane Doe software engineer\tTypeScript\nRemote');});
 it('does not interpret unrelated XML with a w prefix as Word text',async()=>{const file=await zipFile({'word/document.xml':'<w:doc xmlns:w="https://example.org/not-word"><w:p><w:t>Jane Doe software engineer</w:t></w:p></w:doc>'});await expect(extractCvText(file,'docx')).rejects.toThrow('No usable text');});
 it('enforces the text limit even when text consists of tabs or paragraphs',async()=>{const file=await zipFile({'word/document.xml':`<w:doc xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:t>Jane Doe software engineer</w:t>${'<w:tab/>'.repeat(40001)}</w:p></w:doc>`});await expect(extractCvText(file,'docx')).rejects.toThrow('invalid or too long');});
 it('rejects a DTD in document XML',async()=>{const file=await zipFile({'word/document.xml':'<!DOCTYPE doc [<!ENTITY x "Jane Doe software engineer">]><doc>&x;</doc>'});await expect(extractCvText(file,'docx')).rejects.toThrow('invalid or too long');});
 it('extracts text from PDF',async()=>{const doc=await PDFDocument.create();const font=await doc.embedFont(StandardFonts.Helvetica);doc.addPage().drawText('Jane Doe software engineer', {font});const bytes=await doc.save();expect(await extractCvText(Buffer.from(bytes),'pdf')).toContain('Jane Doe software engineer');});
 it('rejects invalid or unsupported files',async()=>{await expect(extractCvText(Buffer.from('not a pdf'),'pdf')).rejects.toThrow();await expect(extractCvText(Buffer.from('anything'),'exe')).rejects.toThrow();});
 it('rejects DOCX without a document',async()=>{const file=await zipFile({'other.txt':'hello'});await expect(extractCvText(file,'docx')).rejects.toThrow();});
 it('rejects oversized extraction fields',()=>expect(extractionSchema.safeParse({full_name:'x'.repeat(121),headline:'',location:'',summary:'',skills:''}).success).toBe(false));
});
