import {z} from 'zod';
export const careerKinds=['experience','education','project','certification','volunteering','award','publication'] as const;
const date=z.union([z.literal(''),z.iso.date()]);
export const careerEntrySchema=z.object({kind:z.enum(careerKinds),title:z.string().trim().min(1).max(200),organization:z.string().trim().max(200),start_date:date,end_date:date,description:z.string().trim().max(6000)}).refine(v=>!v.start_date||!v.end_date||v.end_date>=v.start_date,{message:'End date must not precede start date'});
export type CareerEntryFormState={kind:'idle'|'error'|'conflict';message:string};
/** Accept PostgREST timestamps, including microseconds and explicit UTC offsets. */
export function careerEntryVersion(value:FormDataEntryValue|null):string|null {
 if(typeof value!=='string'||value.length>80||!z.iso.datetime({offset:true}).safeParse(value).success||!Number.isFinite(Date.parse(value)))return null;
 return value;
}
/** Ensure consecutive app writes have distinct versions even within one millisecond. */
export function nextCareerEntryVersion(previous:string,now=Date.now()):string {
 const time=Math.max(now,Date.parse(previous)+1);
 return new Date(time).toISOString();
}
