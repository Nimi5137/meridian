import { z } from 'zod';
export const extractionFields = ['full_name','headline','location','summary','skills'] as const;
export const extractionSchema = z.object({full_name:z.string().max(120),headline:z.string().max(200),location:z.string().max(200),summary:z.string().max(6000),skills:z.string().max(3000)}).strict();
export const extractionInstruction = 'Return a JSON object with exactly these string keys: full_name, headline, location, summary, skills. Use an empty string when not stated. Summarize only explicit facts in the source, retain dates and details where present, and list explicitly stated skills as comma-separated text. Do not infer or invent qualifications or achievements.';
