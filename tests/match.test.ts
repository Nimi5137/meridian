import {describe,it,expect} from 'vitest';
import {matchSchema} from '../src/lib/jobs/match';
const match={score:72,explanation:'Relevant skills',strengths:['Experience'],gaps:['Some skills unknown'],eligibility_concerns:['Authorization not stated'],opportunities:[]};
describe('match output',()=>{it('accepts complete structured analysis',()=>expect(matchSchema.safeParse(match).success).toBe(true));it('rejects missing eligibility and scores outside range',()=>{expect(matchSchema.safeParse({...match,score:101}).success).toBe(false);expect(matchSchema.safeParse({...match,eligibility_concerns:undefined}).success).toBe(false);});});
