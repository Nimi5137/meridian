import {describe,expect,it} from 'vitest';
import {emptyPreparationNotes,formatPreparationNotes,preparationPrompts} from '../src/lib/interviews/preparation';
describe('manual interview preparation',()=>{
 it('creates an honest blank guide without invented candidate facts',()=>{const output=formatPreparationNotes('Researcher','Example',emptyPreparationNotes);expect(output).toContain('Role: Researcher');expect(output).toContain('Company: Example');expect(output).toContain('Avoid inventing outcomes');expect(output.match(/\(No notes\)/g)).toHaveLength(preparationPrompts.length);});
 it('includes only user-provided notes and preserves Unicode',()=>{const output=formatPreparationNotes('Designer','Example',{...emptyPreparationNotes,evidence:'Építettem egy projektet.'});expect(output).toContain('Építettem egy projektet.');expect(output).not.toContain('undefined');});
 it('bounds notes and removes control characters from listing labels',()=>{const output=formatPreparationNotes('Role\nForged: value','Company\r\nFake', {...emptyPreparationNotes,interest:'x'.repeat(4100)});expect(output).toContain('Role: Role Forged: value\nCompany: Company  Fake');expect(output).toContain('x'.repeat(4000));expect(output).not.toContain('x'.repeat(4001));});
});
