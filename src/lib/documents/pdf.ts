import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument, type PDFFont} from 'pdf-lib';

// The bundled Noto Sans font supports Latin, Greek, and Cyrillic. Complex/bidirectional
// scripts require a layout engine and are rejected, rather than producing misleading output.
export class UnsupportedPdfText extends Error {}
const FONT_PATH=join(process.cwd(),'src/assets/fonts/NotoSans-Regular.ttf');
const PAGE_WIDTH=595.28, PAGE_HEIGHT=841.89, MARGIN=54, FONT_SIZE=11, LEADING=16, MAX_PAGES=100;
const supportedLetter=/[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}]/u;
const isLetter=/\p{Letter}/u;
const unsafeControl=/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u;

function validate(content:string, font:PDFFont){
 if(content.length>30000||!content.isWellFormed())throw new UnsupportedPdfText('Document is too long or contains invalid Unicode');
 const available=new Set(font.getCharacterSet());
 for(const char of content){
  if(char==='\n'||char==='\r')continue;
  if(unsafeControl.test(char)||(isLetter.test(char)&&!supportedLetter.test(char))||!available.has(char.codePointAt(0)!))throw new UnsupportedPdfText('Document contains characters unsupported by PDF export');
 }
}
/** Produce plain-text A4 pages. Never silently omit unsupported glyphs or exceed the page cap. */
export async function makePdf(content:string):Promise<Uint8Array>{
 const pdf=await PDFDocument.create({updateMetadata:false});
 pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(await readFile(FONT_PATH),{subset:true});
 validate(content,font);
 const width=PAGE_WIDTH-2*MARGIN;
 const segmenter=new Intl.Segmenter(undefined,{granularity:'grapheme'});
 let page=pdf.addPage([PAGE_WIDTH,PAGE_HEIGHT]), y=PAGE_HEIGHT-MARGIN-FONT_SIZE, pages=1;
 const write=(line:string)=>{
  if(y<MARGIN){if(++pages>MAX_PAGES)throw new UnsupportedPdfText('Document has too many pages');page=pdf.addPage([PAGE_WIDTH,PAGE_HEIGHT]);y=PAGE_HEIGHT-MARGIN-FONT_SIZE;}
  if(line)page.drawText(line,{x:MARGIN,y,size:FONT_SIZE,font});y-=LEADING;
 };
 for(const paragraph of content.replace(/\r\n?/g,'\n').split('\n')){
  const graphemes=Array.from(segmenter.segment(paragraph),item=>item.segment);
  if(graphemes.some(g=>g.length>100))throw new UnsupportedPdfText('Text contains an oversized grapheme');
  if(!graphemes.length){write('');continue;}
  let offset=0;
  while(offset<graphemes.length){
   // Bound each measurement, including pathological unbroken strings, to avoid quadratic work.
   const end=Math.min(offset+200,graphemes.length);
   let low=1,high=end-offset,best=0;
   while(low<=high){const middle=Math.floor((low+high)/2);const candidate=graphemes.slice(offset,offset+middle).join('');if(font.widthOfTextAtSize(candidate,FONT_SIZE)<=width){best=middle;low=middle+1;}else high=middle-1;}
   if(best===0)throw new UnsupportedPdfText('Text cannot fit on a page');
   if(offset+best<graphemes.length){const space=graphemes.slice(offset,offset+best).lastIndexOf(' ');if(space>0)best=space+1;}
   write(graphemes.slice(offset,offset+best).join(''));offset+=best;
  }
 }
 return pdf.save();
}
