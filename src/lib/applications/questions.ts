import {z} from 'zod';
export const questionSchema=z.object({question:z.string().trim().min(3).max(2000),answer:z.string().trim().max(6000),sensitive:z.boolean(),confirmed:z.boolean()}).refine(value=>!value.confirmed||value.answer.length>0,{message:'A confirmed answer cannot be empty'});
