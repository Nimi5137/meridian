import {describe,it,expect} from 'vitest';
import {makeDocx} from '../src/lib/documents/docx';
import {extractCvText} from '../src/lib/cv/extract-text';
describe('DOCX output',()=>{it('preserves Unicode and escapes markup in generated documents',async()=>{const content='Jane Doe & partners <Research>\nBudapest 日本語 العربية';const file=await makeDocx(content);const parsed=await extractCvText(file,'docx');expect(parsed).toContain('Jane Doe & partners <Research>');expect(parsed).toContain('Budapest 日本語 العربية');});it('rejects XML-invalid input without silently dropping it',async()=>{await expect(makeDocx('test\u0000content')).rejects.toThrow();});});
