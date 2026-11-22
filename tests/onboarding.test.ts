import {describe,expect,it} from 'vitest';
import {onboardingSteps} from '../src/lib/onboarding';
const profile={full_name:'',headline:'',location:'',summary:'',skills:'',desired_roles:'',work_preferences:''};
const empty={profile:{data:null,error:null},career:{count:0,error:null},cv:{count:0,error:null},applications:{count:0,error:null}};
describe('onboarding guidance',()=>{
 it('does not invent progress when records are empty',()=>{expect(onboardingSteps(empty).map(step=>step.state)).toEqual(['todo','todo','todo','todo']);});
 it('recognizes saved data without making a name or employment history mandatory',()=>{const steps=onboardingSteps({...empty,profile:{data:{...profile,skills:'Python'},error:null},career:{count:1,error:null},applications:{count:2,error:null}});expect(steps.map(step=>step.state)).toEqual(['done','done','todo','done']);expect(steps[1].description).toContain('project');});
 it('shows unknown instead of claiming completion or emptiness on query failures',()=>{const steps=onboardingSteps({profile:{data:profile,error:new Error('unavailable')},career:{count:0,error:new Error('unavailable')},cv:{count:null,error:null},applications:{count:1,error:new Error('unavailable')}});expect(steps.map(step=>step.state)).toEqual(['unknown','unknown','unknown','unknown']);});
 it('does not consider whitespace-only profile fields or invalid counts complete',()=>{const steps=onboardingSteps({...empty,profile:{data:{...profile,headline:'  '},error:null},career:{count:-1,error:null},cv:{count:NaN,error:null}});expect(steps.map(step=>step.state)).toEqual(['todo','unknown','unknown','todo']);});
 it.each(['location','work_preferences'] as const)('recognizes %s as saved profile data',field=>{expect(onboardingSteps({...empty,profile:{data:{...profile,[field]:'Remote'},error:null}})[0].state).toBe('done');});
 it('links to real profile, original CV and discovery flows',()=>{expect(onboardingSteps(empty).map(step=>step.href)).toEqual(['/profile','/profile/entries/new','/profile#original-documents','/jobs']);});
});
