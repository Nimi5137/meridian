import {z} from 'zod';
export const careerKinds=['experience','education','project','certification','volunteering','award','publication'] as const;
const date=z.union([z.literal(''),z.iso.date()]);
export const careerEntrySchema=z.object({kind:z.enum(careerKinds),title:z.string().trim().min(1).max(200),organization:z.string().trim().max(200),start_date:date,end_date:date,description:z.string().trim().max(6000)}).refine(v=>!v.start_date||!v.end_date||v.end_date>=v.start_date,{message:'End date must not precede start date'});
