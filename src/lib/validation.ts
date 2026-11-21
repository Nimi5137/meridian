import { z } from 'zod';
export const profileSchema = z.object({ full_name:z.string().max(120), headline:z.string().max(200), location:z.string().max(200), summary:z.string().max(6000), skills:z.string().max(3000), desired_roles:z.string().max(2000), work_preferences:z.string().max(2000) });
export const statuses = ['saved','preparing','review_required','action_required','applying','applied','screening','assessment','interview','offer','rejected','withdrawn','expired','failed','archived'] as const;
export const statusSchema = z.enum(statuses);
