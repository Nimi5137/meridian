import {Document, Packer, Paragraph, TextRun} from 'docx';
/** Preserve text exactly by line; reject XML-incompatible content rather than dropping it. */
export async function makeDocx(content:string):Promise<Buffer> {
 if(content.length>30000 || !content.isWellFormed() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/u.test(content)) throw new Error('Document contains unsupported characters');
 const paragraphs=content.replace(/\r\n?/g,'\n').split('\n').map(line=>new Paragraph({children:[new TextRun({text:line})],spacing:{after:100}}));
 const document=new Document({sections:[{properties:{},children:paragraphs}]});return Packer.toBuffer(document);
}
