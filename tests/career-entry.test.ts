import {describe,it,expect} from 'vitest';
import {careerEntrySchema} from '../src/lib/cv/career-entry';
const entry={kind:'project',title:'A project',organization:'',start_date:'',end_date:'',description:''};
describe('career entries',()=>{it('accepts a project without employment or dates',()=>expect(careerEntrySchema.safeParse(entry).success).toBe(true));it('rejects invalid date ranges and impossible dates',()=>{expect(careerEntrySchema.safeParse({...entry,start_date:'2025-01-01',end_date:'2024-01-01'}).success).toBe(false);expect(careerEntrySchema.safeParse({...entry,start_date:'2024-99-99'}).success).toBe(false);});});
