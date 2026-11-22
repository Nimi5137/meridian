import {z} from 'zod';
import {profileSchema} from '@/lib/validation';
export const profileFields=['full_name','headline','location','summary','skills','desired_roles','work_preferences'] as const;
export type ProfileValues=z.infer<typeof profileSchema>;
export type ProfileFormState={kind:'idle'|'saved'|'conflict'|'error';message:string;version:string|null;current?:ProfileValues|null};
export const profileLabels:Record<typeof profileFields[number],string>={full_name:'Full name',headline:'Professional headline',location:'Location',summary:'About you',skills:'Skills and strengths',desired_roles:'Roles you’re interested in',work_preferences:'Work preferences'};
export function changedProfileFields(mine:ProfileValues,current:ProfileValues){return profileFields.filter(field=>mine[field].trim()!==current[field]);}
