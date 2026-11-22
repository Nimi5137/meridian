/** Manual preparation only: prompts are fixed guidance, not AI-generated facts. */
export const preparationPrompts=[
 {id:'interest',title:'Interest in the role',question:'Why does this role interest you? What would you like to learn about the team?'},
 {id:'evidence',title:'Relevant experience',question:'Which specific experience, project or skill would you like to discuss, and what did you personally contribute?'},
 {id:'challenge',title:'A challenge',question:'Choose a real challenge. What was the situation, what did you do, and what happened? Avoid inventing outcomes.'},
 {id:'learning',title:'Learning and growth',question:'What would you need to learn for this role, and how might you approach it?'},
 {id:'questions',title:'Questions for the interviewer',question:'What would you like to ask about responsibilities, success measures, working arrangements or the process?'},
] as const;
export type PreparationId=typeof preparationPrompts[number]['id'];
export type PreparationNotes=Record<PreparationId,string>;
export const emptyPreparationNotes:PreparationNotes={interest:'',evidence:'',challenge:'',learning:'',questions:''};
const safeLabel=(text:string)=>text.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,500);
/** Local text download, intentionally without any generated candidate facts. */
export function formatPreparationNotes(role:string,company:string,notes:PreparationNotes):string {
 const heading=`Interview preparation\nRole: ${safeLabel(role)||'Not specified'}\nCompany: ${safeLabel(company)||'Not specified'}\n\nThese are personal working notes; verify all details before use.\n`;
 return heading+preparationPrompts.map(prompt=>`\n${prompt.title}\n${prompt.question}\n${String(notes[prompt.id]||'').slice(0,4000) || '(No notes)'}\n`).join('');
}
