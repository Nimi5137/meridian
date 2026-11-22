/** Derive optional onboarding suggestions from saved records, never fabricated state. */
type Profile = {full_name:string|null;headline:string|null;location:string|null;summary:string|null;skills:string|null;desired_roles:string|null;work_preferences:string|null};
type ReadResult<T> = {data:T|null;error:unknown};
type CountResult = {count:number|null;error:unknown};
export type OnboardingStep = {id:'profile'|'career'|'cv'|'applications';title:string;description:string;href:string;state:'done'|'todo'|'unknown'};

function countState(result:CountResult):OnboardingStep['state'] {
 if(result.error || result.count===null || !Number.isSafeInteger(result.count) || result.count<0)return 'unknown';
 return result.count>0?'done':'todo';
}
export function onboardingSteps(input:{profile:ReadResult<Profile>;career:CountResult;cv:CountResult;applications:CountResult}):OnboardingStep[] {
 const profileState:OnboardingStep['state']=input.profile.error?'unknown':input.profile.data&&Object.values(input.profile.data).some(value=>typeof value==='string'&&value.trim().length>0)?'done':'todo';
 return [
  {id:'profile',title:'Describe your background and goals',description:'Add a headline, skills, summary or roles you want to explore.',href:'/profile',state:profileState},
  {id:'career',title:'Add a career entry',description:'Include a project, education, experience or another milestone.',href:'/profile/entries/new',state:countState(input.career)},
  {id:'cv',title:'Keep an original CV (optional)',description:'A private PDF or DOCX can be reviewed for extraction later.',href:'/profile#original-documents',state:countState(input.cv)},
  {id:'applications',title:'Save an opportunity',description:'Save a listing when one interests you; nothing is submitted automatically.',href:'/jobs',state:countState(input.applications)},
 ];
}
