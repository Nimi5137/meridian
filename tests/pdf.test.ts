import {describe,it,expect} from 'vitest';
import {PDFDocument} from 'pdf-lib';
import {makePdf,UnsupportedPdfText} from '../src/lib/documents/pdf';
import {extractCvText} from '../src/lib/cv/extract-text';
describe('server PDF export',()=>{
 it('creates an extractable A4 PDF with Latin, accented, Greek and Cyrillic text',async()=>{const text='Jane Doe: researcher & designer\nBudapest, Őrmező; café\nΕλληνικά and Привет';const file=await makePdf(text);expect(Buffer.from(file).subarray(0,5).toString()).toBe('%PDF-');const pdf=await PDFDocument.load(file);expect(pdf.getPageCount()).toBe(1);const extracted=await extractCvText(Buffer.from(file),'pdf');expect(extracted).toContain('Jane Doe: researcher & designer');expect(extracted).toContain('Budapest, Őrmező; café');expect(extracted).toContain('Ελληνικά and Привет');});
 it('wraps long lines and creates multiple pages',async()=>{const file=await makePdf(Array(130).fill('A long line of words that should remain in the exported document.').join('\n'));const pdf=await PDFDocument.load(file);expect(pdf.getPageCount()).toBeGreaterThan(1);const text=await extractCvText(Buffer.from(file),'pdf');expect((text.match(/exported document/g)||[]).length).toBe(130);});
 it('rejects unsupported scripts, controls, malformed Unicode and excessively long documents',async()=>{for(const text of ['Japanese 日本語','Arabic العربية','emoji 😀','tab\tvalue','bidi \u202etest','invalid \ud800','x'.repeat(30001)])await expect(makePdf(text)).rejects.toBeInstanceOf(UnsupportedPdfText);});
 it('limits the page count',async()=>{await expect(makePdf('\n'.repeat(6000))).rejects.toBeInstanceOf(UnsupportedPdfText);});
});
