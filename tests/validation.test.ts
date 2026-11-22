import {describe,it,expect} from 'vitest';
import {profileSchema,statusSchema} from '../src/lib/validation';
import {brand} from '../src/config/brand';
describe('validation',()=>{it('accepts profiles without work history',()=>expect(profileSchema.safeParse({full_name:'Student',headline:'',location:'',summary:'',skills:'',desired_roles:'',work_preferences:''}).success).toBe(true));it('rejects invalid application status',()=>expect(statusSchema.safeParse('submitted_automatically').success).toBe(false));it('defines branding centrally',()=>expect(brand.name.length).toBeGreaterThan(0));});
