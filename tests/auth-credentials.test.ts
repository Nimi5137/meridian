import {describe,it,expect} from 'vitest';
import {passwordInput} from '../src/lib/auth-credentials';
describe('password handling',()=>{
 it('preserves leading and trailing whitespace exactly',()=>{expect(passwordInput('  pass phrase  ',true)).toBe('  pass phrase  ');expect(passwordInput('  pass phrase  ',false)).toBe('  pass phrase  ');});
 it('accepts existing short passwords on sign-in but rejects weak new passwords',()=>{expect(passwordInput('old',false)).toBe('old');expect(passwordInput('old',true)).toBeNull();expect(passwordInput('        ',true)).toBeNull();});
 it('rejects missing, non-text and excessively long values',()=>{expect(passwordInput(null,false)).toBeNull();expect(passwordInput(new File(['a'],'password'),false)).toBeNull();expect(passwordInput('x'.repeat(1025),false)).toBeNull();});
});
